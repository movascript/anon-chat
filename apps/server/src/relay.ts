import type {
	AuthFrame,
	ChatAcceptFrame,
	ChatDeclineFrame,
	ChatRequestFrame,
	Client2ServerFrame,
	MessageFrame,
	OutgoingServerFrame,
	SearchUserFrame,
	SocketID,
	TypingFrame,
	UserID,
} from "@repo/types";
import type { WebSocket } from "ws";
import { serverCrypto } from "./crypto";
import { store } from "./store";

const MAX_MESSAGE_LENGTH = 2_000; // characters

// ─── Entry Point ──────────────────────────────────────────────────────────────

export function handleConnection(ws: WebSocket): void {
	const nonce = serverCrypto.generateNonce();
	const socketID = store.registerSocket(ws, nonce);

	// Issue challenge immediately — client must auth before anything else
	store.sendToSocket(socketID, {
		type: "challenge",
		nonce,
	});

	ws.on("message", (raw) => {
		handleRawMessage(socketID, raw.toString());
	});

	ws.on("close", () => {
		handleDisconnect(socketID);
	});

	ws.on("error", () => {
		handleDisconnect(socketID);
	});
}

// ─── Raw Message Parser ───────────────────────────────────────────────────────

function handleRawMessage(socketID: SocketID, raw: string): void {
	let frame: Client2ServerFrame;

	try {
		frame = JSON.parse(raw);
	} catch {
		sendError(socketID, "Malformed JSON");
		return;
	}

	if (!frame.type || typeof frame.type !== "string") {
		sendError(socketID, "Missing or invalid frame type");
		return;
	}

	const client = store.getClientBySocketID(socketID);
	if (!client) return;

	if (!client.authenticated && frame.type !== "auth") {
		sendError(socketID, "Not authenticated");
		return;
	}

	routeFrame(socketID, frame);
}

// ─── Frame Router ─────────────────────────────────────────────────────────────

// Return type is `void | Promise<void>` because handleAuth is async.
// Callers never await routeFrame — fire-and-forget is intentional here.
function routeFrame(socketID: SocketID, frame: Client2ServerFrame) {
	switch (frame.type) {
		case "auth":
			return handleAuth(socketID, frame);
		case "search_user":
			return handleSearchUser(socketID, frame);
		case "chat_request":
			return handleChatRequest(socketID, frame);
		case "chat_accept":
			return handleChatAccept(socketID, frame);
		case "chat_decline":
			return handleChatDecline(socketID, frame);
		case "message":
			return handleMessage(socketID, frame);
		case "typing":
			return handleTyping(socketID, frame);
		default: {
			frame satisfies never; // ensures no unhandled frame exists
			sendError(socketID, "Unknown frame type");
		}
	}
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
const NONCE_TTL_MS = 30_000; // 30 seconds

async function handleAuth(socketID: SocketID, frame: AuthFrame): Promise<void> {
	const client = store.getClientBySocketID(socketID);
	if (!client) return;

	if (client.authenticated) {
		sendError(socketID, "Already authenticated");
		return;
	}

	if (!client.pendingNonce || client.nonceIssuedAt === null) {
		sendError(socketID, "No pending challenge");
		return;
	}

	// Reject expired nonces
	if (Date.now() - client.nonceIssuedAt > NONCE_TTL_MS) {
		store.sendToSocket(socketID, {
			type: "auth_error",
			reason: "Challenge expired — reconnect to get a fresh nonce",
		});
		return;
	}

	const { username, publicKey, signature } = frame;

	// ── Username validation ───────────────────────────────────────────────────

	if (!isValidUsername(username)) {
		store.sendToSocket(socketID, {
			type: "auth_error",
			reason:
				"Username must be 3–32 characters, alphanumeric and underscores only",
		});
		return;
	}

	// ── Key import ────────────────────────────────────────────────────────────

	let cryptoKey: CryptoKey;

	try {
		cryptoKey = await serverCrypto.importPublicKey(publicKey);
	} catch (err) {
		store.sendToSocket(socketID, {
			type: "auth_error",
			reason: `Invalid public key: ${String(err)}`,
		});
		return;
	}

	// ── Signature verification ────────────────────────────────────────────────

	const valid = await serverCrypto.verifySignature(
		cryptoKey,
		client.pendingNonce,
		signature,
	);

	if (!valid) {
		store.sendToSocket(socketID, {
			type: "auth_error",
			reason: "Signature verification failed",
		});
		return;
	}

	// ── Promote client ────────────────────────────────────────────────────────

	const userID = await serverCrypto.deriveUserID(publicKey);
	const success = store.authenticateClient(
		socketID,
		userID,
		username,
		publicKey,
	);

	if (!success) {
		store.sendToSocket(socketID, {
			type: "auth_error",
			reason: "Username already taken",
		});
		return;
	}

	store.sendToSocket(socketID, {
		type: "auth_success",
		username,
		userID,
	});

	// Reconnecting user — notify any existing subscribers they are back online
	broadcastPresence(userID, username, true);
}

// ─── Search ───────────────────────────────────────────────────────────────────

function handleSearchUser(socketID: SocketID, frame: SearchUserFrame): void {
	const target = store.getClientByUsername(frame.username);

	if (!target || !target.authenticated) {
		store.sendToSocket(socketID, {
			type: "search_result",

			username: frame.username,
			found: false,
			online: false,
		});
		return;
	}

	store.sendToSocket(socketID, {
		type: "search_result",
		username: target.username,
		found: true,
		online: true,
		userID: target.userID,
		publicKey: target.publicKey,
	});
}

// ─── Chat Request ─────────────────────────────────────────────────────────────

function handleChatRequest(socketID: SocketID, frame: ChatRequestFrame): void {
	const sender = store.getClientBySocketID(socketID);
	if (!sender) return;

	const target = store.getClientByUserID(frame.toUserID);

	if (!target || !target.authenticated) {
		sendError(socketID, "user is offline!");
		return;
	}

	// Subscribe sender to target's presence
	store.subscribeToPresence(socketID, frame.toUserID);

	store.sendToUserID(frame.toUserID, {
		type: "chat_request_in",
		fromUserID: sender.userID,
		fromUsername: sender.username,
		fromPublicKey: sender.publicKey,
	});
}

// ─── Chat Accept / Decline ────────────────────────────────────────────────────

function handleChatAccept(socketID: SocketID, frame: ChatAcceptFrame): void {
	const acceptor = store.getClientBySocketID(socketID);
	if (!acceptor) return;

	// Subscribe both sides to each other's presence
	store.subscribeToPresence(socketID, frame.toUserID);

	const targetSocketID = store.getSocketIDByUserID(frame.toUserID);
	if (targetSocketID) {
		store.subscribeToPresence(targetSocketID, acceptor.userID);
	}

	store.sendToUserID(frame.toUserID, {
		type: "chat_response",
		fromUserID: acceptor.userID,
		accepted: true,
	});
}

function handleChatDecline(socketID: SocketID, frame: ChatDeclineFrame): void {
	const decliner = store.getClientBySocketID(socketID);
	if (!decliner) return;

	// Remove the requester's presence subscription — they were auto-subscribed
	// in handleChatRequest and should not keep receiving presence events
	// for someone who declined them.
	const requesterSocketID = store.getSocketIDByUserID(frame.toUserID);
	if (requesterSocketID) {
		store.unsubscribeFromPresence(requesterSocketID, decliner.userID);
	}

	store.sendToUserID(frame.toUserID, {
		type: "chat_response",
		fromUserID: decliner.userID,
		accepted: false,
	});
}

// ─── Message ──────────────────────────────────────────────────────────────────

function handleMessage(socketID: SocketID, frame: MessageFrame): void {
	const sender = store.getClientBySocketID(socketID);
	if (!sender) return;

	if (
		typeof frame.content !== "string" ||
		frame.content.length > MAX_MESSAGE_LENGTH
	) {
		sendError(
			socketID,
			`Message content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
		);
		return;
	}

	const delivered = store.sendToUserID(frame.toUserID, {
		type: "message_in",
		fromUserID: sender.userID,
		fromUsername: sender.username,
		messageId: frame.messageId,
		content: frame.content,
	});

	store.sendToSocket(socketID, {
		type: "message_ack",
		messageId: frame.messageId,
		delivered,
		reason: delivered ? undefined : "offline",
	});
}

// ─── Typing ───────────────────────────────────────────────────────────────────

function handleTyping(socketID: SocketID, frame: TypingFrame): void {
	const sender = store.getClientBySocketID(socketID);
	if (!sender) return;

	store.sendToUserID(frame.toUserID, {
		type: "typing_in",
		fromUserID: sender.userID,
		isTyping: frame.isTyping,
	});
}

// ─── Disconnect ───────────────────────────────────────────────────────────────

function handleDisconnect(socketID: SocketID): void {
	const removed = store.removeClient(socketID);
	if (!removed || !removed.authenticated) return;

	store.removeAllSubscriptions(socketID);
	broadcastPresence(removed.userID, removed.username, false);
}

// ─── Presence Broadcast ───────────────────────────────────────────────────────

function broadcastPresence(
	userID: UserID,
	username: string,
	online: boolean,
): void {
	const subscribers = store.getPresenceSubscribers(userID);
	if (subscribers.length === 0) return;

	const frame: OutgoingServerFrame = {
		type: "presence",
		userID,
		username,
		online,
	};

	for (const watcherSocketID of subscribers) {
		store.sendToSocket(watcherSocketID, frame);
	}
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function isValidUsername(username: string): boolean {
	return /^[a-zA-Z0-9_]{3,32}$/.test(username);
}

/**
 * Send a generic error frame to a socket.
 * Used for protocol-level mistakes (bad JSON, wrong frame type, not authed).
 * Not the same as domain errors like auth_error — those are sent inline.
 */
function sendError(socketID: SocketID, reason: string): void {
	store.sendToSocket(socketID, {
		type: "error",
		reason,
	});
}
