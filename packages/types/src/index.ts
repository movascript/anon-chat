export type MessageType =
  | "challenge"
  | "auth"
  | "auth_success"
  | "auth_error"
  | "search_user"
  | "search_result"
  | "chat_request"
  | "chat_request_in"
  | "chat_accept"
  | "chat_decline"
  | "chat_response"
  | "message"
  | "message_in"
  | "message_ack"
  | "presence"
  | "typing"
  | "typing_in"
  | "error"

// ─── Base ────────────────────────────────────────────────────────────────────

export interface WSFrame {
  type: MessageType
  id: string
  ts: number
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface ChallengeFrame extends WSFrame {
  type: "challenge"
  nonce: string
}

export interface AuthFrame extends WSFrame {
  type: "auth"
  username: string
  publicKey: string   // JWK stringified
  signature: string   // base64 encoded signature of nonce
}

export interface AuthSuccessFrame extends WSFrame {
  type: "auth_success"
  username: string
  userID: string
}

export interface AuthErrorFrame extends WSFrame {
  type: "auth_error"
  reason: string
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchUserFrame extends WSFrame {
  type: "search_user"
  username: string
}

export interface SearchResultFrame extends WSFrame {
  type: "search_result"
  username: string
  found: boolean
  online: boolean
  userID?: string
  publicKey?: string
}

// ─── Chat Request ─────────────────────────────────────────────────────────────

export interface ChatRequestFrame extends WSFrame {
  type: "chat_request"
  toUserID: string
}

export interface ChatRequestInFrame extends WSFrame {
  type: "chat_request_in"
  fromUserID: string
  fromUsername: string
}

export interface ChatAcceptFrame extends WSFrame {
  type: "chat_accept"
  toUserID: string
}

export interface ChatDeclineFrame extends WSFrame {
  type: "chat_decline"
  toUserID: string
}

export interface ChatResponseFrame extends WSFrame {
  type: "chat_response"
  fromUserID: string
  accepted: boolean
}

// ─── Messaging ───────────────────────────────────────────────────────────────

export interface MessageFrame extends WSFrame {
  type: "message"
  toUserID: string
  content: string
  conversationID: string
}

export interface MessageInFrame extends WSFrame {
  type: "message_in"
  fromUserID: string
  fromUsername: string
  content: string
  conversationID: string
  originalID: string
}

export interface MessageAckFrame extends WSFrame {
  type: "message_ack"
  originalID: string
  delivered: boolean
  reason?: "offline" | "not_found"
}

// ─── Presence ────────────────────────────────────────────────────────────────

export interface PresenceFrame extends WSFrame {
  type: "presence"
  userID: string
  username: string
  online: boolean
}

// ─── Typing ──────────────────────────────────────────────────────────────────

export interface TypingFrame extends WSFrame {
  type: "typing"
  toUserID: string
  isTyping: boolean
}

export interface TypingInFrame extends WSFrame {
  type: "typing_in"
  fromUserID: string
  isTyping: boolean
}

// ─── Error ───────────────────────────────────────────────────────────────────

export interface ErrorFrame extends WSFrame {
  type: "error"
  reason: string
}

// ─── Union of all valid incoming frames (client → server) ────────────────────

export type IncomingFrame =
  | AuthFrame
  | SearchUserFrame
  | ChatRequestFrame
  | ChatAcceptFrame
  | ChatDeclineFrame
  | MessageFrame
  | TypingFrame

// ─── Union of all valid outgoing frames (server → client) ────────────────────

export type OutgoingFrame =
  | ChallengeFrame
  | AuthSuccessFrame
  | AuthErrorFrame
  | SearchResultFrame
  | ChatRequestInFrame
  | ChatResponseFrame
  | MessageInFrame
  | MessageAckFrame
  | PresenceFrame
  | TypingInFrame
  | ErrorFrame

// ─── Internal server client record ───────────────────────────────────────────

export interface ConnectedClient {
  userID: string
  username: string
  publicKey: string        // JWK stringified, kept for search results
  socket: unknown          // typed as unknown here, cast to WebSocket in store
  connectedAt: number
  pendingNonce: string | null   // cleared after successful auth
  authenticated: boolean
}
