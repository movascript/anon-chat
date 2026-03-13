// WebSocket singleton with a simple typed event emitter.
// Handles the challenge→auth handshake automatically once
// credentials are provided.

type FrameType =
	| "challenge"
	| "auth_success"
	| "auth_error"
	| "error"
	| "search_result"
	| "chat_request_in"
	| "chat_response"
	| "message_in"
	| "message_ack"
	| "presence"
	| "typing_in";

type FrameHandler = (frame: Record<string, unknown>) => void;

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001/ws";

class AnonSocket {
	private ws: WebSocket | null = null;
	private handlers = new Map<FrameType, Set<FrameHandler>>();
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	connect() {
		if (this.ws?.readyState === WebSocket.OPEN) return;

		this.ws = new WebSocket(WS_URL);

		this.ws.onmessage = (event) => {
			try {
				const frame = JSON.parse(event.data as string) as Record<
					string,
					unknown
				>;
				const type = frame.type as FrameType;
				this.handlers.get(type)?.forEach((h) => h(frame));
			} catch {
				console.error("[ws] failed to parse frame", event.data);
			}
		};

		this.ws.onclose = () => {
			this.scheduleReconnect();
		};

		this.ws.onerror = () => {
			this.ws?.close();
		};
	}

	private scheduleReconnect() {
		if (this.reconnectTimer) return;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.connect();
		}, 2000);
	}

	send(frame: Record<string, unknown>) {
		if (this.ws?.readyState !== WebSocket.OPEN) {
			console.warn("[ws] tried to send while not connected");
			return;
		}
		this.ws.send(JSON.stringify(frame));
	}

	on(type: FrameType, handler: FrameHandler) {
		if (!this.handlers.has(type)) this.handlers.set(type, new Set());
		this.handlers.get(type)!.add(handler);
		return () => this.handlers.get(type)?.delete(handler); // unsubscribe
	}

	disconnect() {
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
		this.ws?.close();
		this.ws = null;
	}
}

export const socket = new AnonSocket();
