type Brand<T, B> = T & { __brand: B };

export type SocketID = Brand<string, "SocketID">;
export type UserID = Brand<string, "UserID">;
export type MessageID = Brand<string, "MessageID">;

export type Client2ServerFrameType =
	| "auth"
	| "typing"
	| "search_user"
	| "chat_request"
	| "chat_accept"
	| "chat_decline"
	| "message";

export type Server2ClientFrameType =
	| "challenge"
	| "auth_success"
	| "auth_error"
	| "search_result"
	| "presence"
	| "typing_in"
	| "chat_request_in"
	| "message_in"
	| "message_ack"
	| "chat_response"
	| "error";

export type FrameType = Client2ServerFrameType | Server2ClientFrameType;

// ─── Base ────────────────────────────────────────────────────────────────────

export interface WSFrame {
	type: FrameType;
	id: string;
	ts: number;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface ChallengeFrame extends WSFrame {
	type: "challenge";
	nonce: string;
}

export interface AuthFrame extends WSFrame {
	type: "auth";
	username: string;
	publicKey: string; // JWK stringified
	signature: string; // base64 encoded signature of nonce
}

export interface AuthSuccessFrame extends WSFrame {
	type: "auth_success";
	username: string;
	userID: UserID;
}

export interface AuthErrorFrame extends WSFrame {
	type: "auth_error";
	reason: string;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchUserFrame extends WSFrame {
	type: "search_user";
	username: string;
}

export interface SearchResultFrame extends WSFrame {
	type: "search_result";
	username: string;
	found: boolean;
	online: boolean;
	userID?: UserID;
	publicKey?: string;
}

// ─── Chat Request ─────────────────────────────────────────────────────────────

export interface ChatRequestFrame extends WSFrame {
	type: "chat_request";
	toUserID: UserID;
}

export interface ChatRequestInFrame extends WSFrame {
	type: "chat_request_in";
	fromUserID: UserID;
	fromUsername: string;
	fromPublicKey: string;
}

export interface ChatAcceptFrame extends WSFrame {
	type: "chat_accept";
	toUserID: UserID;
}

export interface ChatDeclineFrame extends WSFrame {
	type: "chat_decline";
	toUserID: UserID;
}

export interface ChatResponseFrame extends WSFrame {
	type: "chat_response";
	fromUserID: UserID;
	accepted: boolean;
}

// ─── Messaging ───────────────────────────────────────────────────────────────

export interface MessageFrame extends WSFrame {
	type: "message";
	toUserID: UserID;
	messageId: MessageID;
	content: string;
}

export interface MessageInFrame extends WSFrame {
	type: "message_in";
	fromUserID: UserID;
	fromUsername: string;
	messageId: MessageID;
	content: string;
}

export interface MessageAckFrame extends WSFrame {
	type: "message_ack";
	messageId: MessageID;
	delivered: boolean;
	reason?: "offline" | "not_found";
}

// ─── Presence ────────────────────────────────────────────────────────────────

export interface PresenceFrame extends WSFrame {
	type: "presence";
	userID: UserID;
	username: string;
	online: boolean;
}

// ─── Typing ──────────────────────────────────────────────────────────────────

export interface TypingFrame extends WSFrame {
	type: "typing";
	toUserID: UserID;
	isTyping: boolean;
}

export interface TypingInFrame extends WSFrame {
	type: "typing_in";
	fromUserID: UserID;
	isTyping: boolean;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export interface ErrorFrame extends WSFrame {
	type: "error";
	reason: string;
}

// ─── Union of all valid client → server ────────────────────

export type Client2ServerFrame =
	| AuthFrame
	| SearchUserFrame
	| ChatRequestFrame
	| ChatAcceptFrame
	| ChatDeclineFrame
	| MessageFrame
	| TypingFrame;

// ─── Union of all valid server → client ────────────────────

export type Server2ClientFrame =
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
	| ErrorFrame;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
	? Omit<T, K>
	: never;

export type OutgoingClientFrame = DistributiveOmit<
	Client2ServerFrame,
	"id" | "ts"
>;
export type OutgoingServerFrame = DistributiveOmit<
	Server2ClientFrame,
	"id" | "ts"
>;
