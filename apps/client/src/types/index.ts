import type { MessageID, UserID } from "@repo/types"

/**
 * The local identity — created once on first launch, never leaves the device.
 * `id` is always 1 (singleton row).
 */
export interface Identity {
	id: 1
	userID: UserID // SHA-256 of publicKeyJwk (matches server derivation)
	displayName: string
	username: string
	publicKey: JsonWebKey
	privateKey: JsonWebKey // NEVER sent to server
	createdAt: number
}

/**
 * The in-memory identity used at runtime.
 * Holds live CryptoKey objects alongside the plain record from IndexedDB.
 */
export interface RuntimeIdentity {
	userID: UserID
	username: string
	displayName: string
	publicKey: CryptoKey // verify + export only
	privateKey: CryptoKey // sign only — never exported after initial save
	publicKeyJwk: JsonWebKey
}

/**
 * Lifecycle:
 *   pending_out  — we sent a chat_request, waiting for their response
 *   pending_in   — they sent a chat_request to us, awaiting our action
 *   accepted     — mutually accepted, full chat available
 *   declined     — request was declined by either side
 *   blocked      — locally blocked, no frames sent/accepted
 */
export type ContactStatus =
	| "pending_out"
	| "pending_in"
	| "accepted"
	| "declined"
	| "blocked"
	| "deleted"

/**
 * One record per known peer.
 * Also acts as the conversation header.
 * Primary key is their `userID`.
 */
export interface Contact {
	id: UserID // userID — primary key
	username: string
	displayName: string
	publicKey: JsonWebKey
	status: ContactStatus
	lastMessage: string | null // preview text (empty string before any message)
	lastMessageAt: number | null // ms timestamp (0 before any message)
	unreadCount: number
	createdAt: number
	updatedAt: number
}

export interface RuntimeContact extends Contact {
	online: boolean
	isTyping: boolean
}

/**
 * Status lifecycle:
 *   sending   — optimistic, in-flight to server
 *   delivered — server confirmed delivery to recipient's socket
 *   failed    — server returned delivered:false or timeout
 *   received  — inbound message from peer
 */
export type MessageStatus = "sending" | "delivered" | "failed" | "received"

/**
 * For outbound messages, `senderUserID` is our own userID.
 * For inbound messages, `senderUserID` is the peer's userID.
 */
export interface Message {
	id: MessageID // matches frame.messageId
	userID: UserID // foreign key → Contact.id
	sentByMe: boolean // determiness who actually sent the message in the chat
	content: string
	status: MessageStatus
	ts: number
}

export type SearchedContact = {
	username: string
	displayName: string
	userID: UserID
	publicKey: JsonWebKey
}
