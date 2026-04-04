import type {
	AuthSuccessFrame,
	ChallengeFrame,
	Client2ServerFrame,
	OutgoingClientFrame,
	Server2ClientFrame,
} from "@repo/types"
import type { RuntimeIdentity } from "./identity"
import { signNonce } from "./identity"

// ! socket states should be more precise and the socket should
// ! handle reconnections and auth error instead of just closing it

// ─── Event Map ────────────────────────────────────────────────────────────────

/**
 * All events the socket emits to the rest of the app.
 * Consumers call `socket.on("message", handler)` etc.
 */
type BaseSocketEvents = {
	connected: []
	authenticated: []
	disconnected: [code: number, reason: string]
	reconnecting: [attempt: number]
	frame: [frame: Server2ClientFrame]
}

type FrameEvents = {
	[K in Server2ClientFrame["type"]]: [frame: Extract<Server2ClientFrame, { type: K }>]
}

type SocketEventMap = BaseSocketEvents & FrameEvents

type EventListener<K extends keyof SocketEventMap> = (...args: SocketEventMap[K]) => void

// ─── Reconnect Config ─────────────────────────────────────────────────────────

export interface SocketConfig {
	url?: string
	/** Max reconnection attempts before giving up. Default: Infinity */
	maxRetries?: number
	/** Base delay in ms for exponential backoff. Default: 500 */
	baseDelay?: number
	/** Maximum backoff delay cap in ms. Default: 30_000 */
	maxDelay?: number
	/** Jitter factor 0–1. Default: 0.3 */
	jitter?: number
}

// ─── Socket State ─────────────────────────────────────────────────────────────

type SocketState =
	| "idle" // never connected
	| "connecting" // WebSocket open in progress
	| "authenticating" // WS open, waiting for challenge → auth_success
	| "ready" // authenticated, can send frames
	| "reconnecting" // closed, backoff timer running
	| "closed" // permanently shut down (maxRetries exceeded or manual close)

// ─── AnonSocket Class ─────────────────────────────────────────────────────────

export class AnonSocket {
	private ws: WebSocket | null = null
	private identity!: RuntimeIdentity
	private config: Required<SocketConfig>
	private state: SocketState = "idle"

	private retryCount = 0
	private retryTimer: ReturnType<typeof setTimeout> | null = null

	/** Frames queued while not yet authenticated */
	private sendQueue: Client2ServerFrame[] = []

	/** Typed event listener registry */
	private listeners: {
		[K in keyof SocketEventMap]?: Set<EventListener<K>>
	} = {}

	constructor(config?: SocketConfig) {
		this.config = {
			maxRetries: config?.maxRetries ?? Infinity,
			baseDelay: config?.baseDelay ?? 500,
			maxDelay: config?.maxDelay ?? 30_000,
			jitter: config?.jitter ?? 0.3,
			url: config?.url ?? import.meta.env.VITE_WS_URL,
		}
	}

	// ─── Public API ─────────────────────────────────────────────────────────────

	/** Opens the connection. Safe to call once. */
	connect(identity: RuntimeIdentity): void {
		this.identity = identity
		if (this.state !== "idle") {
			console.warn("[AnonSocket] connect() called in state:", this.state)
			return
		}
		this.openSocket()
	}

	/**
	 * Sends a frame to the server.
	 * If not yet authenticated, the frame is queued and sent once auth completes.
	 * Throws if the socket is permanently closed.
	 */
	send(frame: OutgoingClientFrame): void {
		if (this.state === "closed") {
			throw new Error("[AnonSocket] Cannot send — socket is permanently closed")
		}
		if (this.state === "ready") {
			this.transmit(frame)
		}
	}

	/**
	 * Closes the connection permanently — no further reconnections.
	 */
	close(code = 1000, reason = "client closed"): void {
		this.transitionTo("closed")
		this.clearRetryTimer()
		this.ws?.close(code, reason)
		this.ws = null
	}

	get currentState(): SocketState {
		return this.state
	}

	// ─── Event Emitter ───────────────────────────────────────────────────────────

	on<K extends keyof SocketEventMap>(event: K, listener: EventListener<K>): () => void {
		if (!this.listeners[event]) {
			// TypeScript needs a cast here because the Set type is per-K
			;(this.listeners as Record<string, Set<unknown>>)[event] = new Set()
		}
		;(this.listeners[event] as Set<EventListener<K>>).add(listener)

		// Returns an unsubscribe function
		return () => this.off(event, listener)
	}

	off<K extends keyof SocketEventMap>(event: K, listener: EventListener<K>): void {
		;(this.listeners[event] as Set<EventListener<K>> | undefined)?.delete(listener)
	}

	private emit<K extends keyof SocketEventMap>(event: K, ...args: SocketEventMap[K]): void {
		const set = this.listeners[event] as Set<EventListener<K>> | undefined
		if (!set) return
		for (const listener of set) {
			try {
				listener(...args)
			} catch (err) {
				console.error(`[AnonSocket] Listener error on "${event}":`, err)
			}
		}
	}

	// ─── Connection Lifecycle ────────────────────────────────────────────────────

	private openSocket(): void {
		this.transitionTo("connecting")
		const ws = new WebSocket(this.config.url)
		this.ws = ws

		ws.onopen = () => this.handleOpen()
		ws.onmessage = ev => this.handleMessage(ev)
		ws.onclose = ev => this.handleClose(ev)
		ws.onerror = ev => this.handleError(ev)
	}

	private handleOpen(): void {
		console.info("[AnonSocket] WebSocket open — awaiting challenge")
		this.transitionTo("authenticating")
		this.emit("connected")
		// Server sends challenge immediately after open — nothing to do here yet
	}

	private async handleMessage(e: MessageEvent): Promise<void> {
		let frame: Server2ClientFrame

		try {
			frame = JSON.parse(e.data)
			console.debug("IN", frame)
		} catch {
			console.error("[AnonSocket] Received non-JSON message:", e.data)
			return
		}

		// Emit catch-all frame event
		this.emit("frame", frame)

		// Emit typed convenience events
		switch (frame.type) {
			case "challenge":
				await this.handleChallenge(frame)
				this.emit("challenge", frame)
				break
			case "auth_success":
				this.handleAuthSuccess(frame)
				this.emit("auth_success", frame)
				break
			case "auth_error":
				console.error("[AnonSocket] Auth rejected:", frame.reason)
				// Treat auth failure as permanent — don't retry (it won't fix itself)
				this.close(4001, "auth_error")
				this.emit("auth_error", frame)
				break
			case "search_result":
				this.emit("search_result", frame)
				break
			case "presence":
				this.emit("presence", frame)
				break
			case "typing_in":
				this.emit("typing_in", frame)
				break
			case "chat_request_in":
				this.emit("chat_request_in", frame)
				break
			case "chat_response":
				this.emit("chat_response", frame)
				break
			case "message_in":
				this.emit("message_in", frame)
				break
			case "message_ack":
				this.emit("message_ack", frame)
				break
			case "error":
				this.emit("error", frame)
				break
			default:
				frame satisfies never // ensures no unhandled frame exists
		}
	}

	private handleClose(e: CloseEvent): void {
		console.info(`[AnonSocket] Closed — code: ${e.code}, reason: "${e.reason}"`)
		this.emit("disconnected", e.code, e.reason)

		if (this.state === "closed") return // manual close — do not reconnect
		if (e.code === 4001) return // auth failure — do not reconnect

		this.scheduleReconnect()
	}

	private handleError(e: Event): void {
		// WebSocket onerror gives very little info — the onclose fires right after
		// with the actual code. Just log here.
		console.error("[AnonSocket] WebSocket error:", e)
	}

	// ─── Auth Handshake ──────────────────────────────────────────────────────────

	private async handleChallenge(frame: ChallengeFrame): Promise<void> {
		console.info("[AnonSocket] Challenge received — signing nonce")

		let signature: string

		try {
			signature = await signNonce(this.identity.privateKey, frame.nonce)
		} catch (err) {
			console.error("[AnonSocket] Failed to sign nonce:", err)
			this.close(4002, "sign_failed")
			return
		}

		this.transmit({
			type: "auth",
			username: this.identity.username,
			displayName: this.identity.displayName,
			publicKey: JSON.stringify(this.identity.publicKeyJwk),
			signature,
		})
	}

	private handleAuthSuccess(frame: AuthSuccessFrame): void {
		console.info(`[AnonSocket] Authenticated — userID: ${frame.userID}`)
		this.retryCount = 0 // reset backoff on successful auth
		this.transitionTo("ready")
		this.emit("authenticated")
		this.flushQueue()
	}

	// ─── Reconnection ────────────────────────────────────────────────────────────

	private scheduleReconnect(): void {
		if (this.retryCount >= this.config.maxRetries) {
			console.warn("[AnonSocket] Max retries reached — giving up")
			this.transitionTo("closed")
			return
		}

		this.transitionTo("reconnecting")
		this.retryCount++

		const delay = this.calcBackoff(this.retryCount)
		console.info(`[AnonSocket] Reconnecting in ${delay}ms (attempt ${this.retryCount})`)
		this.emit("reconnecting", this.retryCount)

		this.retryTimer = setTimeout(() => {
			this.retryTimer = null
			this.openSocket()
		}, delay)
	}

	/**
	 * Exponential backoff with full jitter.
	 *
	 * $delay = \min(base \times 2^{attempt},\, maxDelay) \times (1 - jitter \times rand)$
	 */
	private calcBackoff(attempt: number): number {
		const exp = this.config.baseDelay * 2 ** (attempt - 1)
		const capped = Math.min(exp, this.config.maxDelay)
		const jitter = 1 - this.config.jitter * Math.random()
		return Math.round(capped * jitter)
	}

	private clearRetryTimer(): void {
		if (this.retryTimer !== null) {
			clearTimeout(this.retryTimer)
			this.retryTimer = null
		}
	}

	// ─── Send Helpers ────────────────────────────────────────────────────────────

	private transmit(frame: OutgoingClientFrame): void {
		console.debug("OUT", frame)

		const fullFrame: Client2ServerFrame = {
			...frame,
			id: window.crypto.randomUUID(),
			ts: Date.now(),
		}

		if (this.ws?.readyState !== WebSocket.OPEN) {
			console.warn("[AnonSocket] transmit() called but WS not open — queuing")
			if (fullFrame.type !== "auth") {
				this.sendQueue.push(fullFrame)
			}
			return
		}
		this.ws.send(JSON.stringify(fullFrame))
	}

	/** Drain the queue after auth completes */
	private flushQueue(): void {
		const queued = this.sendQueue.splice(0)
		for (const frame of queued) {
			this.transmit(frame)
		}
		if (queued.length > 0) {
			console.info(`[AnonSocket] Flushed ${queued.length} queued frame(s)`)
		}
	}

	// ─── State Machine ────────────────────────────────────────────────────────────

	private transitionTo(next: SocketState): void {
		console.debug(`[AnonSocket] ${this.state} → ${next}`)
		this.state = next
	}
}
