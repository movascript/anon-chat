import type { MessageID, UserID } from "@repo/types"
import Dexie, { type Table } from "dexie"
import type { Contact, ContactStatus, Identity, Message, MessageStatus } from "@/types"

// ─── Dexie Subclass ───────────────────────────────────────────────────────────

class AnonChatDB extends Dexie {
	identity!: Table<Identity, number>
	contacts!: Table<Contact, string>
	messages!: Table<Message, string>

	constructor() {
		super("AnonChat")

		this.version(1).stores({
			// always fetched by id:1
			identity: "id",

			// primary key = userId
			// indexes: username lookup, status filter, recency ordering
			contacts: "id, username, displayName, status, lastMessageAt, updatedAt",

			// primary key = messageId
			// compound index enables efficient per-peer time-ordered queries
			messages: "id, userID, ts, [userID+ts]",
		})
	}
}

// ─── Singleton Instance ───────────────────────────────────────────────────────

export const db = new AnonChatDB()

// ─── Identity Helpers ─────────────────────────────────────────────────────────

/**
 * Returns the stored identity, or null on first launch.
 */
export async function getIdentity() {
	return (await db.identity.get(1)) ?? null
}

/**
 * Persists a newly generated identity.
 * Throws if one already exists — call `clearIdentity()` first if re-keying.
 */
export async function saveIdentity(record: Identity) {
	const existing = await db.identity.get(1)
	if (existing) {
		throw new Error("Identity already exists — call clearIdentity() first")
	}
	await db.identity.put(record)
}

/**
 * Nuclear option: wipes identity + all user data.
 * Only called during a deliberate "reset account" flow.
 */
export async function clearIdentity() {
	await db.transaction("rw", db.identity, db.contacts, db.messages, async () => {
		await db.identity.clear()
		await db.contacts.clear()
		await db.messages.clear()
	})
}

// ─── Contact Helpers ──────────────────────────────────────────────────────────

export async function getContact(userID: UserID) {
	return (await db.contacts.get(userID)) ?? null
}

/**
 * All contacts ordered by most recently active.
 */
export async function getAllContacts() {
	return db.contacts.orderBy("updatedAt").reverse().toArray()
}

/**
 * Only accepted contacts, ordered by most recent message.
 */
export async function getAcceptedContacts() {
	return db.contacts
		.where("status")
		.equals("accepted")
		.sortBy("lastMessageAt")
		.then(rows => rows.reverse())
}

/**
 * Upsert a contact. `createdAt` is preserved on update.
 * `updatedAt` is always refreshed unless explicitly supplied.
 */
export async function upsertContact(
	contact: Omit<Contact, "createdAt" | "updatedAt">
): Promise<void> {
	const now = Date.now()
	const existing = await db.contacts.get(contact.id)

	const record: Contact = {
		id: contact.id,
		username: contact.username,
		displayName: contact.displayName,
		publicKey: contact.publicKey,
		status: contact.status,

		// Conversation state: use provided value, or existing, or default
		lastMessage: contact.lastMessage ?? existing?.lastMessage ?? "",
		lastMessageAt: contact.lastMessageAt ?? existing?.lastMessageAt ?? 0,
		unreadCount: contact.unreadCount ?? existing?.unreadCount ?? 0,

		// Timestamps
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	}

	await db.contacts.put(record)
}

export async function updateContactStatus(userID: UserID, status: ContactStatus) {
	await db.contacts.update(userID, { status, updatedAt: Date.now() })
}

/**
 * Updates the conversation preview on the contact record.
 * Called whenever a message is saved.
 */
export async function updateContactLastMessage(
	userID: UserID,
	lastMessage: string,
	lastMessageAt: number
) {
	await db.contacts.update(userID, {
		lastMessage,
		lastMessageAt,
		updatedAt: Date.now(),
	})
}

export async function incrementUnread(userID: UserID) {
	const contact = await db.contacts.get(userID)
	if (!contact) return
	await db.contacts.update(userID, {
		unreadCount: contact.unreadCount + 1,
		updatedAt: Date.now(),
	})
}

export async function clearUnread(userID: UserID) {
	await db.contacts.update(userID, {
		unreadCount: 0,
		updatedAt: Date.now(),
	})
}

// ─── Message Helpers ──────────────────────────────────────────────────────────

export async function getMessage(id: MessageID) {
	return (await db.messages.get(id)) ?? null
}

/**
 * Returns all messages for a given peer in ascending time order.
 * No pagination — entire history is local, fetch is O(n) on IndexedDB only.
 * ? may need pagination in the future but for now works fine
 */
export async function getMessages(userID: UserID) {
	return db.messages
		.where("[userID+ts]")
		.between([userID, Dexie.minKey], [userID, Dexie.maxKey])
		.sortBy("ts")
}

export async function saveMessage(message: Message) {
	await db.messages.put(message)
}

/**
 * Called when the server ack arrives.
 */
export async function updateMessageStatus(id: MessageID, status: MessageStatus) {
	await db.messages.update(id, { status })
}

/**
 * Atomically saves a message and updates the contact's conversation preview.
 * For inbound messages also increments the unread counter.
 */
export async function saveMessageAndSync(
	message: Message,
	options: { incrementUnread?: boolean } = {}
) {
	await db.transaction("rw", db.messages, db.contacts, async () => {
		await db.messages.put(message)
		await updateContactLastMessage(message.userID, message.content, message.ts)
		if (options.incrementUnread) {
			const contact = await db.contacts.get(message.userID)
			if (contact) {
				await db.contacts.update(message.userID, {
					unreadCount: contact.unreadCount + 1,
					updatedAt: Date.now(),
				})
			}
		}
	})
}
