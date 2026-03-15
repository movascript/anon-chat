import type {
	MessageAckFrame,
	MessageID,
	MessageInFrame,
	TypingInFrame,
	UserID,
} from "@repo/types";
import type { ConversationRecord, MessageRecord } from "./db";
import { db } from "./db";
import type { AnonSocket } from "./socket";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * What the UI renders in a chat bubble.
 * Mirrors the DB `Message` row exactly — no transformation needed.
 */
export type { MessageRecord };

/**
 * A page of messages returned by `loadMessages()`.
 * `hasMore` tells the UI whether to show a "Load earlier" button.
 */
export interface MessagePage {
	messages: MessageRecord[];
	hasMore: boolean;
	/** Opaque cursor — pass back to `loadMessages()` to get the next page. */
	before: number | undefined;
}

/**
 * Result of `sendMessage()`.
 */
export type SendResult =
	| { ok: true; message: MessageRecord }
	| { ok: false; reason: string };

/**
 * Payload for sending — the caller provides text, we handle everything else.
 */
export interface SendOptions {
	conversationID: string; // existing conversation ID
	toUserID: UserID;
	text: string;
}

/**
 * Typing event the UI can react to.
 */
export interface TypingEvent {
	conversationID: string;
	fromUserID: UserID;
	typing: boolean;
}

/** Default page size for `loadMessages()` */
const PAGE_SIZE = 40;

// ─── MessagingManager ─────────────────────────────────────────────────────────

export class MessagingManager {
	private socket: AnonSocket;
	private myUserID: string;
	private unsubs: Array<() => void> = [];

	// UI-facing reactive callbacks
	private onMessageListeners: Array<(msg: MessageRecord) => void> = [];
	private onAckListeners: Array<(ack: MessageAckFrame) => void> = [];
	private onTypingListeners: Array<(evt: TypingEvent) => void> = [];

	constructor(socket: AnonSocket, myUserID: string) {
		this.socket = socket;
		this.myUserID = myUserID;
	}

	// ─── Lifecycle ─────────────────────────────────────────────────────────────

	/** Attach socket listeners. Call once after socket reaches "authenticated". */
	init(): void {
		this.attachSocketListeners();
	}

	/** Detach all socket listeners. Call on logout / account reset. */
	destroy(): void {
		for (const unsub of this.unsubs) unsub();
		this.unsubs = [];
	}

	// ─── Sending ───────────────────────────────────────────────────────────────

	/**
	 * Send a plaintext message to a contact.
	 *
	 * Flow:
	 * 1. Generate a stable `messageID` (UUID v4).
	 * 2. Persist the message immediately with `status: "sending"`.
	 * 3. Update the conversation's `lastMessage` snapshot.
	 * 4. Emit the message to UI listeners (optimistic render).
	 * 5. Push the `message` frame to the server.
	 * 6. Await `message_ack` — the server calls back via socket event.
	 *    The ack handler updates the DB row to `delivered` or `failed`.
	 */
	async sendMessage({
		conversationID,
		toUserID,
		text,
	}: SendOptions): Promise<SendResult> {
		if (!text.trim()) {
			return { ok: false, reason: "Message text cannot be empty" };
		}

		const messageId = crypto.randomUUID() as MessageID;

		const message: MessageRecord = {
			id: messageId,
			conversationID,
			senderUserID: this.myUserID,
			content: text.trim(),
			status: "sending",
			ts: Date.now(),
		};

		try {
			// Atomic write: message row + conversation snapshot
			await db.transaction("rw", db.messages, db.conversations, async () => {
				await db.messages.put(message);
				await this.upsertConversationSnapshot(
					conversationID,
					toUserID,
					message,
				);
			});
		} catch (err) {
			const reason = err instanceof Error ? err.message : String(err);
			console.error("[Messaging] DB write failed:", err);
			return { ok: false, reason };
		}

		// Optimistic UI update — render before server confirms
		this.emitMessage(message);

		// Push to server
		this.socket.send({
			type: "message",
			messageId,
			toUserID,
			content: message.content,
			// ts: message.ts,
		});

		console.info(`[Messaging] Sent message ${messageId} to ${toUserID}`);
		return { ok: true, message };
	}

	// ─── Typing Indicator ──────────────────────────────────────────────────────

	/**
	 * Send a typing start/stop notification.
	 * Fire-and-forget — no ACK, no DB write.
	 */
	sendTyping(toUserID: UserID, isTyping: boolean): void {
		this.socket.send({ type: "typing", toUserID, isTyping });
	}

	// ─── Pagination ────────────────────────────────────────────────────────────

	/**
   * Load a page of messages for a conversation, newest-first.
   *
   * @param conversationID - Which conversation to page through
   * @param before         - Timestamp cursor; omit to load the latest page
   * @param limit          - Messages per page (default 40)
   *
   * Usage:
   *
```ts
   * // Initial load
   * const page = await messaging.loadMessages({ conversationID })
   *
   * // Load older messages
   * if (page.hasMore) {
   *   const older = await messaging.loadMessages({
   *     conversationID,
   *     before: page.before,
   *   })
   * }
   * 
*/

	async loadMessages(opts: {
		conversationID: string;
		before?: number;
		limit?: number;
	}): Promise<MessagePage> {
		const { conversationID, before, limit = PAGE_SIZE } = opts;

		// Use the compound index [conversationID+ts] for efficient range scan
		const upperBound = before ?? Date.now() + 1;

		const rows = await db.messages
			.where("[conversationID+ts]")
			.between(
				[conversationID, 0],
				[conversationID, upperBound],
				true, // include lower bound
				false, // exclude upper bound (strict less-than `before`)
			)
			.reverse() // newest first
			.limit(limit + 1) // fetch one extra to detect hasMore
			.toArray();

		const hasMore = rows.length > limit;
		const messages = hasMore ? rows.slice(0, limit) : rows;

		// Cursor is the oldest message's timestamp on this page
		const oldestTs =
			messages.length > 0 ? messages[messages.length - 1].ts : undefined;

		return {
			messages: messages.reverse(), // return chronological order to UI
			hasMore,
			before: oldestTs,
		};
	}

	// ─── Conversation List ─────────────────────────────────────────────────────

	/**

    Returns all conversations sorted by most recent message,
    for rendering the conversation list / sidebar.

*/

	async listConversations(): Promise<ConversationRecord[]> {
		return db.conversations.orderBy("updatedAt").reverse().toArray();
	}

	/**

    Returns a single conversation by ID, or null if not found.

*/

	async getConversation(
		conversationID: string,
	): Promise<ConversationRecord | null> {
		return (await db.conversations.get(conversationID)) ?? null;
	}

	/**

    Marks all messages in a conversation as read.
    Resets the unreadCount on the conversation row.

*/

	async markRead(conversationID: string): Promise<void> {
		await db.conversations.update(conversationID, {
			unreadCount: 0,
			// updatedAt   : Date.now(),
		});
	}

	// ─── Reactive Listeners ────────────────────────────────────────────────────

	/**

    Subscribe to incoming (and optimistically sent) messages.
    Fires for both outbound messages (own sends) and inbound messages from peers.
    Returns an unsubscribe function.
    @example

                                                                    ts
   * const off = messaging.onMessage((msg) => {
   *   setMessages(prev => [...prev, msg])
   * })
   * 

*/

	onMessage(cb: (msg: MessageRecord) => void): () => void {
		this.onMessageListeners.push(cb);
		return () => {
			this.onMessageListeners = this.onMessageListeners.filter((f) => f !== cb);
		};
	}

	/**

    Subscribe to delivery acknowledgements.
    Use this to flip a message’s status indicator (clock → tick → double-tick).
    Returns an unsubscribe function.

*/

	onAck(cb: (ack: MessageAckFrame) => void): () => void {
		this.onAckListeners.push(cb);
		return () => {
			this.onAckListeners = this.onAckListeners.filter((f) => f !== cb);
		};
	}

	/**

    Subscribe to typing events from contacts.
    Returns an unsubscribe function.

*/

	onTyping(cb: (evt: TypingEvent) => void): () => void {
		this.onTypingListeners.push(cb);
		return () => {
			this.onTypingListeners = this.onTypingListeners.filter((f) => f !== cb);
		};
	}

	// ─── Private: Socket Event Handling ───────────────────────────────────────

	private attachSocketListeners(): void {
		const unsubMsg = this.socket.on("message_in", (frame) =>
			this.handleIncomingMessage(frame),
		);

		const unsubAck = this.socket.on("message_ack", (frame) =>
			this.handleAck(frame),
		);

		const unsubTyping = this.socket.on("typing_in", (frame) =>
			this.handleTypingIn(frame),
		);

		this.unsubs.push(unsubMsg, unsubAck, unsubTyping);
	}

	/**

    Handles a message frame arriving from a contact.
    Flow:
        Derive the conversationID from the sender’s userID.
        Persist to IndexedDB.
        Bump the conversation’s unread count + last-message snapshot.
        Emit to UI listeners.

*/

	private async handleIncomingMessage(frame: MessageInFrame): Promise<void> {
		const conversationID = deriveConversationID(
			this.myUserID,
			frame.fromUserID,
		);
		const now = Date.now();

		const message: MessageRecord = {
			id: frame.id,
			conversationID,
			senderUserID: frame.fromUserID,
			content: frame.content,
			status: "received",
			ts: frame.ts ?? now,
		};

		try {
			await db.transaction("rw", db.messages, db.conversations, async () => {
				// Idempotency: ignore duplicates (possible on reconnect)
				const exists = await db.messages.get(frame.id);
				if (exists) return;

				await db.messages.put(message);
				await this.upsertConversationSnapshot(
					conversationID,
					frame.fromUserID,
					message,
					true, // increment unread
				);
			});
		} catch (err) {
			console.error("[Messaging] Failed to persist incoming message:", err);
			return;
		}

		this.emitMessage(message);
		console.info(
			`[Messaging] Received message ${frame.id} from ${frame.fromUserID}`,
		);
	}

	/**

    Handles message_ack from the server.
    Updates the message row’s status field in IndexedDB
    and notifies UI listeners so they can update the tick indicator.

*/

	private async handleAck(frame: MessageAckFrame): Promise<void> {
		const newStatus = frame.delivered ? "delivered" : "failed";

		try {
			await db.messages.update(frame.id, {
				status: newStatus,
			});
		} catch (err) {
			console.error("[Messaging] Failed to update ack status:", err);
		}

		for (const cb of this.onAckListeners) {
			try {
				cb(frame);
			} catch (err) {
				console.error("[Messaging] onAck listener error:", err);
			}
		}

		console.info(`[Messaging] Ack for ${frame.id}: ${newStatus}`);
	}

	/**

    Handles typing frame from a contact.
    No DB write — typing state is ephemeral.

*/

	private handleTypingIn(frame: TypingInFrame): void {
		const conversationID = deriveConversationID(
			this.myUserID,
			frame.fromUserID,
		);

		const evt: TypingEvent = {
			conversationID,
			fromUserID: frame.fromUserID,
			typing: frame.isTyping,
		};

		for (const cb of this.onTypingListeners) {
			try {
				cb(evt);
			} catch (err) {
				console.error("[Messaging] onTyping listener error:", err);
			}
		}
	}

	// ─── Private: Conversation Upsert ─────────────────────────────────────────

	/**

    Create or update the conversation row with a fresh last-message snapshot.
    Must be called inside a Dexie transaction that includes db.conversations.

*/

	private async upsertConversationSnapshot(
		conversationID: string,
		peerUserID: string,
		message: MessageRecord,
		incrementUnread = false,
	): Promise<void> {
		const existing = await db.conversations.get(conversationID);
		const now = Date.now();

		if (existing) {
			await db.conversations.update(conversationID, {
				lastMessage: message.content,
				lastMessageAt: message.ts,
				// updatedAt       : now,
				unreadCount: incrementUnread
					? (existing.unreadCount ?? 0) + 1
					: (existing.unreadCount ?? 0),
			});
		} else {
			const conversation: ConversationRecord = {
				id: conversationID,
				peerUserID,
				peerUsername: "xoxo", // ! should be changed
				lastMessage: message.content,
				lastMessageAt: message.ts,
				unreadCount: incrementUnread ? 1 : 0,
				createdAt: now,
				// updatedAt       : now,
			};
			await db.conversations.put(conversation);
		}
	}

	// ─── Private: Emit Helpers ─────────────────────────────────────────────────

	private emitMessage(msg: MessageRecord): void {
		for (const cb of this.onMessageListeners) {
			try {
				cb(msg);
			} catch (err) {
				console.error("[Messaging] onMessage listener error:", err);
			}
		}
	}
}

// ─── Conversation ID Derivation ───────────────────────────────────────────────

/**

    Derives a stable, symmetric conversation ID from two userIDs.
    Sorting ensures that deriveConversationID(A, B) === deriveConversationID(B, A).
    This means both sides of the chat independently arrive at the same
    IndexedDB key without any coordination.
    Format: conv_<lower>_<higher>
    @example
    deriveConversationID(“bob123”, “alice456”)
    // → “conv_alice456_bob123”

*/

export function deriveConversationID(userA: string, userB: string): string {
	const [lower, higher] = [userA, userB].sort();

	return `conv_${lower}_${higher}`;
}

// ─── Module-Level Singleton ───────────────────────────────────────────────────

let _instance: MessagingManager | null = null;

/**

    Returns the app-wide MessagingManager singleton.
    @example

                                                                    ts
 * // After socket reaches "authenticated":
 * const messaging = getMessagingManager(socket, identity.userID)
 * messaging.init()
 *
 * // In a React component:
 * const [messages, setMessages] = useState<Message[]>([])
 *
 * useEffect(() => {
 *   const off = messaging.onMessage((msg) => {
 *     if (msg.conversationID === activeConversationID) {
 *       setMessages(prev => [...prev, msg])
 *     }
 *   })
 *   return off
 * }, [activeConversationID])
 * 

*/

export function getMessagingManager(
	socket: AnonSocket,

	myUserID: string,
): MessagingManager {
	if (!_instance) {
		_instance = new MessagingManager(socket, myUserID);
	}

	return _instance;
}

/**

    Tears down the singleton — call on logout or account reset.

*/

export function destroyMessagingManager(): void {
	_instance?.destroy();

	_instance = null;
}
