
import Dexie, { type Table } from "dexie"

// ─── Schema Types ─────────────────────────────────────────────────────────────

/**
 * The local identity — created once on first launch, never leaves the device.
 * `id` is always 1 (singleton).
 */
export interface IdentityRecord {
  id        : 1
  userID    : string        // SHA-256 of publicKeyJwk (matches server derivation)
  username  : string
  publicKey : JsonWebKey    // exportable CryptoKey in JWK form
  privateKey: JsonWebKey    // exportable CryptoKey in JWK form — NEVER sent to server
  createdAt : number        // ms timestamp
}

/**
 * A contact is anyone this user has interacted with or searched.
 * Status drives what UI is shown.
 *
 *   pending_out  — we sent a chat_request, waiting for their response
 *   pending_in   — they sent a chat_request to us, awaiting our action
 *   accepted     — mutually accepted, full chat is available
 *   declined     — they declined our request (or we declined theirs)
 *   blocked      — locally blocked, no further frames sent/accepted
 */
export type ContactStatus =
  | "pending_out"
  | "pending_in"
  | "accepted"
  | "declined"
  | "blocked"

export interface ContactRecord {
  id             : string   // their userID
  username       : string
  publicKey      : JsonWebKey
  status         : ContactStatus
  online         : boolean  // last known presence state
  conversationID : string   // uuid linking to ConversationRecord
  createdAt      : number
  updatedAt      : number
}

/**
 * One conversation per contact pair — always 1-on-1.
 */
export interface ConversationRecord {
  id           : string   // uuid — same value stored in ContactRecord.conversationID
  peerUserID   : string   // foreign key → ContactRecord.id
  peerUsername : string
  lastMessage  : string   // preview text (empty string if no messages yet)
  lastMessageAt: number   // ms timestamp (0 if no messages yet)
  unreadCount  : number
  createdAt    : number
}

/**
 * Status lifecycle:
 *
 *   sending   — optimistic, in-flight to server
 *   delivered — server confirmed delivery to recipient's socket
 *   failed    — server returned delivered:false (recipient offline) or timeout
 *   received  — inbound message from peer
 */
export type MessageStatus = "sending" | "delivered" | "failed" | "received"

export interface MessageRecord {
  id             : string         // matches frame.id (or frame.originalID for inbound)
  conversationID : string         // foreign key → ConversationRecord.id
  senderUserID   : string         // their userID, or our own userID for outbound
  content        : string
  status         : MessageStatus
  ts             : number         // ms timestamp — used for ordering
}

// ─── Dexie Subclass ───────────────────────────────────────────────────────────

class AnonChatDB extends Dexie {
  identity     !: Table<IdentityRecord,    number>
  contacts     !: Table<ContactRecord,     string>
  conversations!: Table<ConversationRecord, string>
  messages     !: Table<MessageRecord,      string>

  constructor() {
    super("AnonChat")

    this.version(1).stores({
      // identity: only `id` is indexed — we always fetch by id:1
      identity     : "id",

      // contacts: primary key = userID; secondary indexes for lookups
      contacts     : "id, username, status, updatedAt",

      // conversations: primary key = uuid; secondary indexes for ordering/lookup
      conversations: "id, peerUserID, lastMessageAt",

      // messages: primary key = uuid; compound index for ordered per-conversation fetch
      messages     : "id, conversationID, ts, [conversationID+ts]",
    })
  }
}

// ─── Singleton Instance ───────────────────────────────────────────────────────

export const db = new AnonChatDB()

// ─── Identity Helpers ─────────────────────────────────────────────────────────

/**
 * Returns the stored identity, or null if this is a first-time launch.
 */
export async function getIdentity(): Promise<IdentityRecord | null> {
  return (await db.identity.get(1)) ?? null
}

/**
 * Persists a newly generated identity.
 * Throws if one already exists — call clearIdentity() first if re-keying.
 */
export async function saveIdentity(record: IdentityRecord): Promise<void> {
  const existing = await db.identity.get(1)
  if (existing) throw new Error("Identity already exists — call clearIdentity() first")
  await db.identity.put(record)
}

/**
 * Nuclear option: wipes identity + all data.
 * Only used during a deliberate "reset account" flow.
 */
export async function clearIdentity(): Promise<void> {
  await db.transaction("rw", db.identity, db.contacts, db.conversations, db.messages, async () => {
    await db.identity.clear()
    await db.contacts.clear()
    await db.conversations.clear()
    await db.messages.clear()
  })
}

// ─── Contact Helpers ──────────────────────────────────────────────────────────

export async function getContact(userID: string): Promise<ContactRecord | null> {
  return (await db.contacts.get(userID)) ?? null
}

export async function getAllContacts(): Promise<ContactRecord[]> {
  return db.contacts.orderBy("updatedAt").reverse().toArray()
}

export async function getAcceptedContacts(): Promise<ContactRecord[]> {
  return db.contacts.where("status").equals("accepted").sortBy("updatedAt")
}

export async function upsertContact(
  contact: Omit<ContactRecord, "createdAt" | "updatedAt"> & {
    createdAt?: number
    updatedAt?: number
  },
): Promise<void> {
  const now      = Date.now()
  const existing = await db.contacts.get(contact.id)

  await db.contacts.put({
    ...contact,
    createdAt: existing?.createdAt ?? contact.createdAt ?? now,
    updatedAt: contact.updatedAt ?? now,
  })
}

export async function updateContactStatus(
  userID: string,
  status: ContactStatus,
): Promise<void> {
  await db.contacts.update(userID, { status, updatedAt: Date.now() })
}

export async function updateContactPresence(
  userID: string,
  online: boolean,
): Promise<void> {
  await db.contacts.update(userID, { online, updatedAt: Date.now() })
}

// ─── Conversation Helpers ─────────────────────────────────────────────────────

export async function getConversation(
  id: string,
): Promise<ConversationRecord | null> {
  return (await db.conversations.get(id)) ?? null
}

export async function getConversationByPeer(
  peerUserID: string,
): Promise<ConversationRecord | null> {
  return (
    (await db.conversations.where("peerUserID").equals(peerUserID).first()) ??
    null
  )
}

export async function getAllConversations(): Promise<ConversationRecord[]> {
  return db.conversations.orderBy("lastMessageAt").reverse().toArray()
}

export async function upsertConversation(conv: ConversationRecord): Promise<void> {
  await db.conversations.put(conv)
}

/**
 * Called whenever a message is saved — keeps the conversation preview in sync.
 */
export async function updateConversationLastMessage(
  conversationID: string,
  lastMessage   : string,
  lastMessageAt : number,
): Promise<void> {
  await db.conversations.update(conversationID, { lastMessage, lastMessageAt })
}

export async function incrementUnread(conversationID: string): Promise<void> {
  const conv = await db.conversations.get(conversationID)
  if (!conv) return
  await db.conversations.update(conversationID, {
    unreadCount: conv.unreadCount + 1,
  })
}

export async function clearUnread(conversationID: string): Promise<void> {
  await db.conversations.update(conversationID, { unreadCount: 0 })
}

// ─── Message Helpers ──────────────────────────────────────────────────────────

export async function getMessage(id: string): Promise<MessageRecord | null> {
  return (await db.messages.get(id)) ?? null
}

/**
 * Fetch a page of messages in ascending time order.
 *
 * @param conversationID   The conversation to query.
 * @param limit            Max rows to return (default 50).
 * @param beforeTs         If set, only return messages with ts < beforeTs
 *                         (cursor-based pagination going backwards in history).
 */
export async function getMessages(
  conversationID: string,
  limit         : number = 50,
  beforeTs      ?: number,
): Promise<MessageRecord[]> {
  let collection = db.messages
    .where("[conversationID+ts]")
    .between(
      [conversationID, beforeTs !== undefined ? Dexie.minKey  : Dexie.minKey],
      [conversationID, beforeTs !== undefined ? beforeTs - 1  : Dexie.maxKey],
    )

  return collection.limit(limit).sortBy("ts")
}

export async function saveMessage(message: MessageRecord): Promise<void> {
  await db.messages.put(message)
}

/**
 * Typically called when the server ack arrives with delivered:true.
 */
export async function updateMessageStatus(
  id    : string,
  status: MessageStatus,
): Promise<void> {
  await db.messages.update(id, { status })
}

/**
 * Convenience: save message AND update the conversation preview atomically.
 */
export async function saveMessageAndUpdateConversation(
  message: MessageRecord,
): Promise<void> {
  await db.transaction(
    "rw",
    db.messages,
    db.conversations,
    async () => {
      await db.messages.put(message)
      await updateConversationLastMessage(
        message.conversationID,
        message.content,
        message.ts,
      )
    },
  )
}
