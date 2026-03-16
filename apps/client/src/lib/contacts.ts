import type {
	ChatRequestInFrame,
	ChatResponseFrame,
	PresenceFrame,
	UserID,
} from "@repo/types";
import { db } from "./db";
import type { AnonSocket } from "./socket";
import type { Contact } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * What the UI layer sees when it asks for a contact.
 * Extends the DB record with a live `online` field that is
 * updated in memory from presence events (no DB write needed).
 */

/** Result of accepting/declining a chat request */
export type RequestResolution =
	| { ok: true; contact: Contact }
	| { ok: false; reason: string };

// ─── In-Memory Presence Cache ─────────────────────────────────────────────────

/**
 * Presence state lives here, not in IndexedDB.
 * Writing presence to disk on every event is wasteful — on reload
 * we re-subscribe and get fresh state from the server anyway.
 */
const presenceCache = new Map<string, boolean>();

// ─── Contacts Manager ─────────────────────────────────────────────────────────

export class ContactsManager {
	private socket: AnonSocket;
	private myUserID: string;
	private unsubs: Array<() => void> = [];

	/**
	 * Listeners registered by the UI for reactive updates.
	 * Keyed by userID so the UI can subscribe to a specific contact.
	 */
	private onPresenceChange: Array<(userID: string, online: boolean) => void> =
		[];
	private onIncomingRequest: Array<(frame: ChatRequestInFrame) => void> = [];

	constructor(socket: AnonSocket, myUserID: string) {
		this.socket = socket;
		this.myUserID = myUserID;
	}

	// ─── Lifecycle ─────────────────────────────────────────────────────────────

	/**
	 * Attach socket event listeners and re-subscribe presence for all
	 * accepted contacts. Call once after `socket` reaches "authenticated".
	 */
	async init(): Promise<void> {
		this.attachSocketListeners();
		await this.resubscribePresence();
	}

	/**
	 * Detach all socket listeners. Call on logout / account reset.
	 */
	destroy(): void {
		for (const unsub of this.unsubs) unsub();
		this.unsubs = [];
	}

	// ─── Sending a Contact Request ─────────────────────────────────────────────

	/**
	 * Initiates a chat request to `toUserID`.
	 *
	 * Flow:
	 * 1. Guard against duplicates.
	 * 2. Write a `pending_out` contact record to IndexedDB.
	 * 3. Send `chat_request` frame to server.
	 * 4. Return the new contact record.
	 */
	async sendRequest(
		toUserID: UserID,
		username: string, // display name we know them by (from search result)
		publicKey: JsonWebKey,
	): Promise<Contact> {
		if (toUserID === this.myUserID) {
			throw new Error("Cannot send a contact request to yourself");
		}

		// Idempotency: if a record already exists, return it as-is
		const existing = await db.contacts.get(toUserID);
		if (existing) {
			return existing;
		}

		const now = Date.now();

		const contact: Contact = {
			id: toUserID,
			username,
			publicKey,
			status: "pending_out",
			online: false,

			lastMessage: null,
			lastMessageAt: null,
			unreadCount: 0,

			createdAt: now,
			updatedAt: now,
		};

		await db.contacts.put(contact);

		this.socket.send({
			type: "chat_request",
			toUserID,
		});

		console.info(`[Contacts] Sent chat request to ${username} (${toUserID})`);
		return contact;
	}

	// ─── Accepting / Declining Incoming Requests ───────────────────────────────

	/**
	 * Accept an incoming `chat_request`.
	 *
	 * Flow:
	 * 1. Upsert contact record with `accepted` status.
	 * 2. Persist their public key for future message verification.
	 * 3. Send positive `chat_request_response` frame.
	 * 4. Subscribe to their presence.
	 * 5. Return enriched contact view.
	 */
	async acceptRequest(frame: ChatRequestInFrame): Promise<RequestResolution> {
		try {
			const now = Date.now();

			const contact: Contact = {
				id: frame.fromUserID,
				username: frame.fromUsername,
				publicKey: JSON.parse(frame.fromPublicKey),
				status: "accepted",
				online: false,

				lastMessage: null,
				lastMessageAt: null,
				unreadCount: 0,

				createdAt: now,
				updatedAt: now,
			};

			await db.contacts.put(contact);

			this.socket.send({
				type: "chat_accept",
				toUserID: frame.fromUserID,
			});

			// Subscribe to their online/offline events
			this.subscribePresence([frame.fromUserID]);

			console.info(
				`[Contacts] Accepted request from ${frame.fromUsername} (${frame.fromUserID})`,
			);

			return { ok: true, contact: contact };
		} catch (err) {
			const reason = err instanceof Error ? err.message : String(err);
			return { ok: false, reason };
		}
	}

	/**
	 * Decline an incoming `chat_request`.
	 *
	 * We optionally persist a `blocked` record to prevent the same user
	 * from flooding us with requests.
	 */
	async declineRequest(
		frame: ChatRequestInFrame,
		block = false,
	): Promise<void> {
		this.socket.send({
			type: "chat_decline",
			toUserID: frame.fromUserID,
		});

		if (block) {
			const now = Date.now();
			await db.contacts.put({
				id: frame.fromUserID,
				username: frame.fromUsername,
				publicKey: JSON.parse(frame.fromPublicKey),
				status: "blocked",
				online: false,

				lastMessage: null,
				lastMessageAt: null,
				unreadCount: 0,

				createdAt: now,
				updatedAt: now,
			});
			console.info(`[Contacts] Blocked ${frame.fromUserID}`);
		} else {
			console.info(`[Contacts] Declined request from ${frame.fromUserID}`);
		}
	}

	// ─── Querying Contacts ─────────────────────────────────────────────────────

	/** Returns every contact record enriched with live presence. */
	async listAll(): Promise<Contact[]> {
		const rows = await db.contacts.toArray();
		return rows;
	}

	/** Returns accepted contacts only. */
	async listAccepted(): Promise<Contact[]> {
		const rows = await db.contacts.where("status").equals("accepted").toArray();
		return rows;
	}

	/** Returns a single contact by userID, or `null` if unknown. */
	async get(userID: string): Promise<Contact | null> {
		const row = await db.contacts.get(userID);
		return row ? row : null;
	}

	/** Live presence lookup — does not hit IndexedDB. */
	isOnline(userID: string): boolean {
		return presenceCache.get(userID) ?? false;
	}

	// ─── Presence Subscription ─────────────────────────────────────────────────

	/**
	 * Subscribe to presence events for a set of userIDs.
	 * Sends a `subscribe_presence` frame to the server;
	 * the server will immediately push current status and future changes.
	 */
	subscribePresence(userIDs: string[]): void {
		if (userIDs.length === 0) return;
		this.socket.send({ type: "subscribe_presence", userIDs });
	}

	/**
	 * Unsubscribe from presence events for a set of userIDs.
	 * Also clears them from the local cache.
	 */
	unsubscribePresence(userIDs: string[]): void {
		if (userIDs.length === 0) return;
		this.socket.send({ type: "unsubscribe_presence", userIDs });
		for (const id of userIDs) presenceCache.delete(id);
	}

	// ─── Reactive Listeners (for UI layer) ────────────────────────────────────

	/**
   * Register a callback that fires whenever a contact's presence changes.
   * Returns an unsubscribe function.
   *
   * @example
   *
```ts
   * const off = contacts.onPresence((userID, online) => {
   *   setContacts(prev => prev.map(c =>
   *     c.userID === userID ? { ...c, online } : c
   *   ))
   * })
   * 
   */

	onPresence(cb: (userID: string, online: boolean) => void): () => void {
		this.onPresenceChange.push(cb);
		return () => {
			this.onPresenceChange = this.onPresenceChange.filter((f) => f !== cb);
		};
	}

	/**

    Register a callback for incoming chat requests.
    Returns an unsubscribe function.
    The UI should call acceptRequest or declineRequest with the frame.

*/

	onRequest(cb: (frame: ChatRequestInFrame) => void): () => void {
		this.onIncomingRequest.push(cb);
		return () => {
			this.onIncomingRequest = this.onIncomingRequest.filter((f) => f !== cb);
		};
	}

	// ─── Private: Socket Event Handling ───────────────────────────────────────

	private attachSocketListeners(): void {
		const unsubPresence = this.socket.on("presence", (frame) =>
			this.handlePresenceFrame(frame),
		);

		const unsubRequest = this.socket.on("chat_request_in", (frame) =>
			this.handleChatRequestInFrame(frame),
		);

		const unsubResponse = this.socket.on("chat_response", (frame) =>
			this.handleChatResponseFrame(frame),
		);

		this.unsubs.push(unsubPresence, unsubRequest, unsubResponse);
	}

	private handlePresenceFrame(frame: PresenceFrame): void {
		presenceCache.set(frame.userID, frame.online);
		for (const cb of this.onPresenceChange) {
			try {
				cb(frame.userID, frame.online);
			} catch (err) {
				console.error("[Contacts] onPresence listener error:", err);
			}
		}
	}

	private async handleChatRequestInFrame(
		frame: ChatRequestInFrame,
	): Promise<void> {
		// Drop request if we've already blocked this user
		const existing = await db.contacts.get(frame.fromUserID);
		if (existing?.status === "blocked") {
			console.info(
				`[Contacts] Silently dropped request from blocked user ${frame.fromUserID}`,
			);
			return;
		}

		// If we already accepted this user, auto-accept (duplicate handshake after reconnect)
		if (existing?.status === "accepted") {
			console.info(
				`[Contacts] Auto-accepting duplicate request from ${frame.fromUserID}`,
			);
			this.socket.send({
				type: "chat_accept",
				toUserID: frame.fromUserID,
			});
			return;
		}

		// Notify UI to show the request dialog
		for (const cb of this.onIncomingRequest) {
			try {
				cb(frame);
			} catch (err) {
				console.error("[Contacts] onRequest listener error:", err);
			}
		}
	}

	private async handleChatResponseFrame(
		frame: ChatResponseFrame,
	): Promise<void> {
		const contact = await db.contacts.get(frame.fromUserID);

		if (!contact) {
			console.warn(
				`[Contacts] Received response for unknown contact ${frame.fromUserID}`,
			);
			return;
		}

		if (contact.status !== "pending_out") {
			// Already resolved (e.g. duplicate ACK after reconnect) — ignore
			return;
		}

		const newStatus = frame.accepted ? "accepted" : "declined";

		await db.contacts.update(frame.fromUserID, {
			status: newStatus,
			updatedAt: Date.now(),
		});

		if (frame.accepted) {
			// Start watching their presence now that we're connected
			this.subscribePresence([frame.fromUserID]);
			console.info(`[Contacts] ${frame.fromUserID} accepted our request`);
		} else {
			console.info(`[Contacts] ${frame.fromUserID} declined our request`);
		}
	}

	// ─── Private: Re-subscription on Reconnect ────────────────────────────────

	/**

    After reconnecting, the server has no memory of our presence subscriptions.
    We re-send subscribe_presence for every accepted contact so we get
    fresh status pushes and resume tracking.

*/

	private async resubscribePresence(): Promise<void> {
		const accepted = await db.contacts
			.where("status")
			.equals("accepted")
			.toArray();

		const ids = accepted.map((c) => c.id);
		if (ids.length > 0) {
			this.subscribePresence(ids);
			console.info(
				`[Contacts] Re-subscribed presence for ${ids.length} contact(s)`,
			);
		}
	}
}

// ─── Module-Level Singleton ───────────────────────────────────────────────────

let _instance: ContactsManager | null = null;

/**

    Returns the app-wide ContactsManager singleton.
    @example

    After socket reaches "authenticated":
    const contacts = getContactsManager(socket, identity.userID)
    await contacts.init()

    contacts.onPresence((userID, online) => { ... })
    contacts.onRequest((frame)  => { showRequestDialog(frame) })
 

*/

export function getContactsManager(
	socket: AnonSocket,

	myUserID: string,
): ContactsManager {
	if (!_instance) {
		_instance = new ContactsManager(socket, myUserID);
	}

	return _instance;
}

/**
    Tears down the singleton — call on logout or account reset.
*/

export function destroyContactsManager(): void {
	_instance?.destroy();
	_instance = null;
}
