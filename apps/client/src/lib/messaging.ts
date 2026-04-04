import type { MessageAckFrame, MessageID, MessageInFrame, TypingInFrame, UserID } from "@repo/types"
import type { Contact, Message } from "@/types"
import { db } from "./db"
import type { AnonSocket } from "./socket"

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Result of `sendMessage()`.
 */
export type SendResult = { ok: true; message: Message } | { ok: false; reason: string }

/**
 * Typing event the UI can react to.
 */
export interface TypingEvent {
	fromUserID: UserID
	typing: boolean
}

// ─── MessagingManager ─────────────────────────────────────────────────────────

export class MessagingManager {
	private socket: AnonSocket
	private unsubs: Array<() => void> = []

	// UI-facing reactive callbacks
	private onMessageListeners: Array<(msg: Message) => void> = []
	private onAckListeners: Array<(ack: MessageAckFrame) => void> = []
	private onTypingListeners: Array<(evt: TypingEvent) => void> = []

	constructor(socket: AnonSocket) {
		this.socket = socket
	}

	// ─── Lifecycle ─────────────────────────────────────────────────────────────

	/** Attach socket listeners. Call once after socket reaches "authenticated". */
	init(): void {
		this.attachSocketListeners()
	}

	/** Detach all socket listeners. Call on logout / account reset. */
	destroy(): void {
		for (const unsub of this.unsubs) unsub()
		this.unsubs = []
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
	async sendMessage(toUserID: UserID, text: string): Promise<SendResult> {
		if (!text.trim()) {
			return { ok: false, reason: "Message text cannot be empty" }
		}

		const messageId = crypto.randomUUID() as MessageID

		const message: Message = {
			id: messageId,
			userID: toUserID,
			sentByMe: true,
			content: text.trim(),
			status: "sending",
			ts: Date.now(),
		}

		try {
			// Atomic write: message row + contact snapshot
			await db.transaction("rw", db.messages, db.contacts, async () => {
				await db.messages.put(message)
				await this.upsertConversationSnapshot(toUserID, message)
			})
		} catch (err) {
			const reason = err instanceof Error ? err.message : String(err)
			console.error("[Messaging] DB write failed:", err)
			return { ok: false, reason }
		}

		// Optimistic UI update — render before server confirms
		this.emitMessage(message)

		// Push to server
		this.socket.send({
			type: "message",
			messageId,
			toUserID,
			content: message.content,
			// ts: message.ts,
		})

		console.info(`[Messaging] Sent message ${messageId} to ${toUserID}`)
		return { ok: true, message }
	}

	// ─── Typing Indicator ──────────────────────────────────────────────────────

	/**
	 * Send a typing start/stop notification.
	 * Fire-and-forget — no ACK, no DB write.
	 */
	sendTyping(toUserID: UserID, isTyping: boolean): void {
		this.socket.send({ type: "typing", toUserID, isTyping })
	}

	/**

    Marks all messages in a conversation as read.
    Resets the unreadCount on the conversation row.

*/

	async markRead(userID: UserID): Promise<void> {
		await db.contacts.update(userID, {
			unreadCount: 0,
		})
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

	onMessage(cb: (msg: Message) => void): () => void {
		this.onMessageListeners.push(cb)
		return () => {
			this.onMessageListeners = this.onMessageListeners.filter(f => f !== cb)
		}
	}

	/**

    Subscribe to delivery acknowledgements.
    Use this to flip a message’s status indicator (clock → tick → double-tick).
    Returns an unsubscribe function.

*/

	onAck(cb: (ack: MessageAckFrame) => void): () => void {
		this.onAckListeners.push(cb)
		return () => {
			this.onAckListeners = this.onAckListeners.filter(f => f !== cb)
		}
	}

	/**

    Subscribe to typing events from contacts.
    Returns an unsubscribe function.

*/

	onTyping(cb: (evt: TypingEvent) => void): () => void {
		this.onTypingListeners.push(cb)
		return () => {
			this.onTypingListeners = this.onTypingListeners.filter(f => f !== cb)
		}
	}

	// ─── Private: Socket Event Handling ───────────────────────────────────────

	private attachSocketListeners(): void {
		const unsubMsg = this.socket.on("message_in", frame => this.handleIncomingMessage(frame))

		const unsubAck = this.socket.on("message_ack", frame => this.handleAck(frame))

		const unsubTyping = this.socket.on("typing_in", frame => this.handleTypingIn(frame))

		this.unsubs.push(unsubMsg, unsubAck, unsubTyping)
	}

	/**

    Handles a message frame arriving from a contact.
    Flow:
        Persist to IndexedDB.
        Bump the conversation’s unread count + last-message snapshot.
        Emit to UI listeners.

*/

	private async handleIncomingMessage(frame: MessageInFrame): Promise<void> {
		const message: Message = {
			id: frame.messageId,
			userID: frame.fromUserID,
			sentByMe: false,
			content: frame.content,
			status: "received",
			ts: frame.ts ?? Date.now(),
		}

		try {
			await db.transaction("rw", db.messages, db.contacts, async () => {
				// Idempotency: ignore duplicates (possible on reconnect)
				const exists = await db.messages.get(frame.id)
				if (exists) return

				await db.messages.put(message)
				await this.upsertConversationSnapshot(
					frame.fromUserID,
					message,
					true // increment unread
				)
			})
		} catch (err) {
			console.error("[Messaging] Failed to persist incoming message:", err)
			return
		}

		this.emitMessage(message)
		console.info(`[Messaging] Received message ${frame.id} from ${frame.fromUserID}`)
	}

	/**

    Handles message_ack from the server.
    Updates the message row’s status field in IndexedDB
    and notifies UI listeners so they can update the tick indicator.

*/

	private async handleAck(frame: MessageAckFrame): Promise<void> {
		const newStatus = frame.delivered ? "delivered" : "failed"

		try {
			await db.messages.update(frame.id, {
				status: newStatus,
			})
		} catch (err) {
			console.error("[Messaging] Failed to update ack status:", err)
		}

		for (const cb of this.onAckListeners) {
			try {
				cb(frame)
			} catch (err) {
				console.error("[Messaging] onAck listener error:", err)
			}
		}

		console.info(`[Messaging] Ack for ${frame.id}: ${newStatus}`)
	}

	/**

    Handles typing frame from a contact.
    No DB write — typing state is ephemeral.

*/

	private handleTypingIn(frame: TypingInFrame): void {
		const evt: TypingEvent = {
			fromUserID: frame.fromUserID,
			typing: frame.isTyping,
		}

		for (const cb of this.onTypingListeners) {
			try {
				cb(evt)
			} catch (err) {
				console.error("[Messaging] onTyping listener error:", err)
			}
		}
	}

	// ─── Private: Conversation Upsert ─────────────────────────────────────────

	/**
	 * Create or update the conversation row with a fresh last-message snapshot.
	 * Must be called inside a Dexie transaction that includes db.conversations.
	 */
	private async upsertConversationSnapshot(
		userID: UserID,
		message: Message,
		incrementUnread = false
	): Promise<void> {
		const existing = await db.contacts.get(userID)
		const now = Date.now()

		if (existing) {
			await db.contacts.update(userID, {
				lastMessage: message.content,
				lastMessageAt: message.ts,
				// updatedAt       : now,
				unreadCount: incrementUnread
					? (existing.unreadCount ?? 0) + 1
					: (existing.unreadCount ?? 0),
			})
		} else {
			// ! this is not ok
			// ! this should not happen at all why is there a message from someone
			// ! that doesnt exist on my contact list, should be refactored
			const record: Contact = {
				id: userID,
				publicKey: {},
				status: "pending_in",
				username: "xoxo", // ! should be changed
				displayName: "Bullshit",
				lastMessage: message.content,
				lastMessageAt: message.ts,
				unreadCount: incrementUnread ? 1 : 0,
				createdAt: now,
				updatedAt: now,
				// updatedAt       : now,
			}
			await db.contacts.put(record)
		}
	}

	// ─── Private: Emit Helpers ─────────────────────────────────────────────────

	private emitMessage(msg: Message): void {
		for (const cb of this.onMessageListeners) {
			try {
				cb(msg)
			} catch (err) {
				console.error("[Messaging] onMessage listener error:", err)
			}
		}
	}
}

// ─── Module-Level Singleton ───────────────────────────────────────────────────

let _instance: MessagingManager | null = null

/**

    Returns the app-wide MessagingManager singleton.
    @example

 * // After socket reaches "authenticated":
 * const messaging = getMessagingManager(socket)
 * messaging.init()
 *
 * // In a React component:
 * const [messages, setMessages] = useState<Message[]>([])
 *
 * useEffect(() => {
 *   const off = messaging.onMessage((msg) => {
 *     if (msg.userID === activeuserIDID) {
 *       setMessages(prev => [...prev, msg])
 *     }
 *   })
 *   return off
 * }, [activeuserIDID])
 * 

*/

export function getMessagingManager(socket: AnonSocket): MessagingManager {
	if (!_instance) {
		_instance = new MessagingManager(socket)
	}

	return _instance
}

/**
	Tears down the singleton — call on logout or account reset.
*/

export function destroyMessagingManager(): void {
	_instance?.destroy()
	_instance = null
}
