// frontend/src/lib/socket.ts

import type { RuntimeIdentity } from "./identity";
import { signNonce } from "./identity";

// ─── Frame Types (mirrors backend/src/types.ts) ───────────────────────────────

/**
 * Every frame type the server can send to us.
 * Kept in sync with the server's ServerFrame union manually —
 * a shared package would be cleaner but adds build complexity.
 */
export type InboundFrameType =
	| "challenge"
	| "auth_ok"
	| "auth_error"
	| "presence"
	| "typing"
	| "chat_request"
	| "chat_request_response"
	| "message"
	| "message_ack"
	| "error";

export type OutboundFrameType =
	| "auth"
	| "typing"
	| "chat_request"
	| "chat_request_response"
	| "message"
	| "subscribe_presence"
	| "unsubscribe_presence";

// Inbound frame shapes

export interface ChallengeFrame {
	type: "challenge";
	nonce: string; // hex string — we sign this
}

export interface AuthOkFrame {
	type: "auth_ok";
	socketID: string;
	userID: string;
}

export interface AuthErrorFrame {
	type: "auth_error";
	message: string;
}

export interface PresenceFrame {
	type: "presence";
	userID: string;
	online: boolean;
}

export interface TypingFrame {
	type: "typing";
	fromUserID: string;
	typing: boolean;
}

export interface ChatRequestFrame {
	type: "chat_request";
	fromUserID: string;
	fromUsername: string;
	fromPublicKey: JsonWebKey;
	requestID: string;
}

export interface ChatRequestResponseFrame {
	type: "chat_request_response";
	requestID: string;
	accepted: boolean;
	fromUserID: string;
}

export interface MessageFrame {
	type: "message";
	id: string;
	fromUserID: string;
	content: string;
	ts: number;
}

export interface MessageAckFrame {
	type: "message_ack";
	id: string;
	delivered: boolean;
}

export interface ErrorFrame {
	type: "error";
	message: string;
}

export type InboundFrame =
	| ChallengeFrame
	| AuthOkFrame
	| AuthErrorFrame
	| PresenceFrame
	| TypingFrame
	| ChatRequestFrame
	| ChatRequestResponseFrame
	| MessageFrame
	| MessageAckFrame
	| ErrorFrame;

// Outbound frame shapes

export interface AuthFrame {
	type: "auth";
	userID: string;
	username: string;
	publicKey: JsonWebKey;
	signedNonce: string; // base64 signature of the challenge nonce
}

export interface SendTypingFrame {
	type: "typing";
	toUserID: string;
	typing: boolean;
}

export interface SendChatRequestFrame {
	type: "chat_request";
	toUserID: string;
	requestID: string;
}

export interface SendChatRequestResponseFrame {
	type: "chat_request_response";
	requestID: string;
	accepted: boolean;
}

export interface SendMessageFrame {
	type: "message";
	id: string;
	toUserID: string;
	content: string;
	ts: number;
}

export interface SubscribePresenceFrame {
	type: "subscribe_presence";
	userIDs: string[];
}

export interface UnsubscribePresenceFrame {
	type: "unsubscribe_presence";
	userIDs: string[];
}

export type OutboundFrame =
	| AuthFrame
	| SendTypingFrame
	| SendChatRequestFrame
	| SendChatRequestResponseFrame
	| SendMessageFrame
	| SubscribePresenceFrame
	| UnsubscribePresenceFrame;

// ─── Event Map ────────────────────────────────────────────────────────────────

/**
 * All events the socket emits to the rest of the app.
 * Consumers call `socket.on("message", handler)` etc.
 */
export interface SocketEventMap {
	connected: []; // TCP open, before auth
	authenticated: [socketID: string]; // auth_ok received
	disconnected: [code: number, reason: string];
	reconnecting: [attempt: number];
	frame: [frame: InboundFrame]; // every inbound frame (catch-all)

	// Convenience per-frame events (subset — add more as needed)
	presence: [frame: PresenceFrame];
	typing: [frame: TypingFrame];
	chat_request: [frame: ChatRequestFrame];
	chat_request_response: [frame: ChatRequestResponseFrame];
	message: [frame: MessageFrame];
	message_ack: [frame: MessageAckFrame];
	error: [frame: ErrorFrame];
}

type EventListener<K extends keyof SocketEventMap> = (
	...args: SocketEventMap[K]
) => void;

// ─── Reconnect Config ─────────────────────────────────────────────────────────

export interface SocketConfig {
	url: string;
	/** Max reconnection attempts before giving up. Default: Infinity */
	maxRetries?: number;
	/** Base delay in ms for exponential backoff. Default: 500 */
	baseDelay?: number;
	/** Maximum backoff delay cap in ms. Default: 30_000 */
	maxDelay?: number;
	/** Jitter factor 0–1. Default: 0.3 */
	jitter?: number;
}

// ─── Socket State ─────────────────────────────────────────────────────────────

type SocketState =
	| "idle" // never connected
	| "connecting" // WebSocket open in progress
	| "authenticating" // WS open, waiting for challenge → auth_ok
	| "ready" // authenticated, can send frames
	| "reconnecting" // closed, backoff timer running
	| "closed"; // permanently shut down (maxRetries exceeded or manual close)

// ─── AnonSocket Class ─────────────────────────────────────────────────────────

export class AnonSocket {
	private ws: WebSocket | null = null;
	private identity: RuntimeIdentity;
	private config: Required<SocketConfig>;
	private state: SocketState = "idle";
	private socketID: string | null = null;

	private retryCount = 0;
	private retryTimer: ReturnType<typeof setTimeout> | null = null;

	/** Frames queued while not yet authenticated */
	private sendQueue: OutboundFrame[] = [];

	/** Typed event listener registry */
	private listeners: {
		[K in keyof SocketEventMap]?: Set<EventListener<K>>;
	} = {};

	constructor(identity: RuntimeIdentity, config: SocketConfig) {
		this.identity = identity;
		this.config = {
			maxRetries: config.maxRetries ?? Infinity,
			baseDelay: config.baseDelay ?? 500,
			maxDelay: config.maxDelay ?? 30_000,
			jitter: config.jitter ?? 0.3,
			url: config.url,
		};
	}

	// ─── Public API ─────────────────────────────────────────────────────────────

	/** Opens the connection. Safe to call once. */
	connect(): void {
		if (this.state !== "idle") {
			console.warn("[AnonSocket] connect() called in state:", this.state);
			return;
		}
		this.openSocket();
	}

	/**
	 * Sends a frame to the server.
	 * If not yet authenticated, the frame is queued and sent once auth completes.
	 * Throws if the socket is permanently closed.
	 */
	send(frame: OutboundFrame): void {
		if (this.state === "closed") {
			throw new Error(
				"[AnonSocket] Cannot send — socket is permanently closed",
			);
		}
		if (this.state === "ready" && this.ws?.readyState === WebSocket.OPEN) {
			this.transmit(frame);
		} else {
			this.sendQueue.push(frame);
		}
	}

	/**
	 * Closes the connection permanently — no further reconnections.
	 */
	close(code = 1000, reason = "client closed"): void {
		this.transitionTo("closed");
		this.clearRetryTimer();
		this.ws?.close(code, reason);
		this.ws = null;
	}

	get currentState(): SocketState {
		return this.state;
	}

	get currentSocketID(): string | null {
		return this.socketID;
	}

	// ─── Event Emitter ───────────────────────────────────────────────────────────

	on<K extends keyof SocketEventMap>(
		event: K,
		listener: EventListener<K>,
	): () => void {
		if (!this.listeners[event]) {
			// TypeScript needs a cast here because the Set type is per-K
			(this.listeners as Record<string, Set<unknown>>)[event] = new Set();
		}
		(this.listeners[event] as Set<EventListener<K>>).add(listener);

		// Returns an unsubscribe function
		return () => this.off(event, listener);
	}

	off<K extends keyof SocketEventMap>(
		event: K,
		listener: EventListener<K>,
	): void {
		(this.listeners[event] as Set<EventListener<K>> | undefined)?.delete(
			listener,
		);
	}

	private emit<K extends keyof SocketEventMap>(
		event: K,
		...args: SocketEventMap[K]
	): void {
		const set = this.listeners[event] as Set<EventListener<K>> | undefined;
		if (!set) return;
		for (const listener of set) {
			try {
				listener(...args);
			} catch (err) {
				console.error(`[AnonSocket] Listener error on "${event}":`, err);
			}
		}
	}

	// ─── Connection Lifecycle ────────────────────────────────────────────────────

	private openSocket(): void {
		this.transitionTo("connecting");
		const ws = new WebSocket(this.config.url);
		this.ws = ws;

		ws.onopen = () => this.handleOpen();
		ws.onmessage = (ev) => this.handleMessage(ev);
		ws.onclose = (ev) => this.handleClose(ev);
		ws.onerror = (ev) => this.handleError(ev);
	}

	private handleOpen(): void {
		console.info("[AnonSocket] WebSocket open — awaiting challenge");
		this.transitionTo("authenticating");
		this.emit("connected");
		// Server sends challenge immediately after open — nothing to do here yet
	}

	private async handleMessage(ev: MessageEvent): Promise<void> {
		let frame: InboundFrame;

		try {
			frame = JSON.parse(ev.data as string) as InboundFrame;
		} catch {
			console.error("[AnonSocket] Received non-JSON message:", ev.data);
			return;
		}

		// Drive the auth handshake before passing frames to the app
		if (frame.type === "challenge") {
			await this.handleChallenge(frame);
			return;
		}

		if (frame.type === "auth_ok") {
			this.handleAuthOk(frame);
			return;
		}

		if (frame.type === "auth_error") {
			console.error("[AnonSocket] Auth rejected:", frame.message);
			// Treat auth failure as permanent — don't retry (it won't fix itself)
			this.close(4001, "auth_error");
			return;
		}

		// Emit catch-all frame event
		this.emit("frame", frame);

		// Emit typed convenience events
		switch (frame.type) {
			case "presence":
				this.emit("presence", frame);
				break;
			case "typing":
				this.emit("typing", frame);
				break;
			case "chat_request":
				this.emit("chat_request", frame);
				break;
			case "chat_request_response":
				this.emit("chat_request_response", frame);
				break;
			case "message":
				this.emit("message", frame);
				break;
			case "message_ack":
				this.emit("message_ack", frame);
				break;
			case "error":
				this.emit("error", frame);
				break;
		}
	}

	private handleClose(ev: CloseEvent): void {
		console.info(
			`[AnonSocket] Closed — code: ${ev.code}, reason: "${ev.reason}"`,
		);
		this.emit("disconnected", ev.code, ev.reason);

		if (this.state === "closed") return; // manual close — do not reconnect
		if (ev.code === 4001) return; // auth failure — do not reconnect

		this.scheduleReconnect();
	}

	private handleError(ev: Event): void {
		// WebSocket onerror gives very little info — the onclose fires right after
		// with the actual code. Just log here.
		console.error("[AnonSocket] WebSocket error:", ev);
	}

	// ─── Auth Handshake ──────────────────────────────────────────────────────────

	private async handleChallenge(frame: ChallengeFrame): Promise<void> {
		console.info("[AnonSocket] Challenge received — signing nonce");

		let signedNonce: string;

		try {
			signedNonce = await signNonce(this.identity.privateKey, frame.nonce);
		} catch (err) {
			console.error("[AnonSocket] Failed to sign nonce:", err);
			this.close(4002, "sign_failed");
			return;
		}

		const authFrame: AuthFrame = {
			type: "auth",
			userID: this.identity.userID,
			username: this.identity.username,
			publicKey: this.identity.publicKeyJwk,
			signedNonce,
		};

		this.transmit(authFrame);
	}

	private handleAuthOk(frame: AuthOkFrame): void {
		console.info(`[AnonSocket] Authenticated — socketID: ${frame.socketID}`);
		this.socketID = frame.socketID;
		this.retryCount = 0; // reset backoff on successful auth
		this.transitionTo("ready");
		this.emit("authenticated", frame.socketID);
		this.flushQueue();
	}

	// ─── Reconnection ────────────────────────────────────────────────────────────

	private scheduleReconnect(): void {
		if (this.retryCount >= this.config.maxRetries) {
			console.warn("[AnonSocket] Max retries reached — giving up");
			this.transitionTo("closed");
			return;
		}

		this.transitionTo("reconnecting");
		this.retryCount++;

		const delay = this.calcBackoff(this.retryCount);
		console.info(
			`[AnonSocket] Reconnecting in ${delay}ms (attempt ${this.retryCount})`,
		);
		this.emit("reconnecting", this.retryCount);

		this.retryTimer = setTimeout(() => {
			this.retryTimer = null;
			this.openSocket();
		}, delay);
	}

	/**
	 * Exponential backoff with full jitter.
	 *
	 * $delay = \min(base \times 2^{attempt},\, maxDelay) \times (1 - jitter \times rand)$
	 */
	private calcBackoff(attempt: number): number {
		const exp = this.config.baseDelay * 2 ** (attempt - 1);
		const capped = Math.min(exp, this.config.maxDelay);
		const jitter = 1 - this.config.jitter * Math.random();
		return Math.round(capped * jitter);
	}

	private clearRetryTimer(): void {
		if (this.retryTimer !== null) {
			clearTimeout(this.retryTimer);
			this.retryTimer = null;
		}
	}

	// ─── Send Helpers ────────────────────────────────────────────────────────────

	private transmit(frame: OutboundFrame | AuthFrame): void {
		if (this.ws?.readyState !== WebSocket.OPEN) {
			console.warn("[AnonSocket] transmit() called but WS not open — queuing");
			if (frame.type !== "auth") {
				this.sendQueue.push(frame as OutboundFrame);
			}
			return;
		}
		this.ws.send(JSON.stringify(frame));
	}

	/** Drain the queue after auth completes */
	private flushQueue(): void {
		const queued = this.sendQueue.splice(0);
		for (const frame of queued) {
			this.transmit(frame);
		}
		if (queued.length > 0) {
			console.info(`[AnonSocket] Flushed ${queued.length} queued frame(s)`);
		}
	}

	// ─── State Machine ────────────────────────────────────────────────────────────

	private transitionTo(next: SocketState): void {
		console.debug(`[AnonSocket] ${this.state} → ${next}`);
		this.state = next;
	}
}

// ─── Singleton Factory ────────────────────────────────────────────────────────

let _instance: AnonSocket | null = null;

/**
 * Returns the app-wide socket instance.
 * Creates it on first call — call `connect()` separately to open the connection.
 *
 * @example
 *
```ts
 * const socket = getSocket(identity, { url: "wss://..." })
 * socket.on("authenticated", (socketID) => { ... })
 * socket.connect()
 * 
*/

export function getSocket(
	identity: RuntimeIdentity,
	config: SocketConfig,
): AnonSocket {
	if (!_instance) {
		_instance = new AnonSocket(identity, config);
	}

	return _instance;
}

/**
    Tears down the singleton — useful during testing or account reset.
*/

export function destroySocket(): void {
	_instance?.close();
	_instance = null;
}
