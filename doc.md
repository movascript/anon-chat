## Architecture Decisions

### State Machine

The socket has 6 explicit states with a single `transitionTo` helper. Every branching decision (`handleClose`, `scheduleReconnect`, `send`) reads `this.state` first, which makes illegal transitions obvious in logs.

idle
│ connect()
▼
connecting
│ WS open
▼
authenticating ──── auth_error (code 4001) ──► closed (permanent)
│ auth_ok
▼
ready ◄─────────────────────────────────────────────────────┐
│ WS close (non-auth) │
▼ │
reconnecting ── attempts < maxRetries ── backoff timer ──────┘
│ attempts ≥ maxRetries
▼
closed

### Auth Error Is Terminal

If the server rejects authentication (`auth_error`), the socket closes with code `4001` and **never reconnects**. Retrying would just get rejected again — the identity either doesn't match or the server is rejecting the key. The UI layer must handle this by prompting a reset.

### Send Queue

Frames sent before `auth_ok` are queued and flushed in insertion order as soon as the handshake completes. This means callers can call `socket.send(...)` immediately after `socket.connect()` without race-conditioning on the auth.

### Backoff Formula

$$delay = \min\!\left(base \times 2^{attempt-1},\; maxDelay\right) \times \left(1 - jitter \times U(0,1)\right)$$

With defaults: attempt 1 → up to 500ms, attempt 2 → up to 1s, attempt 3 → up to 2s ... capped at 30s. Jitter prevents thundering-herd when a server restarts and many clients reconnect simultaneously.

### Typed Event Emitter

The `SocketEventMap` interface makes the `.on()` calls fully typed — the listener receives the correct frame type automatically with no casts needed in consuming code.

------------------------seprator----------------------------

## Data Flow Diagram

Socket Events ContactsManager IndexedDB
───────────── ─────────────── ─────────
chat_request ──────────────► handleChatRequestFrame ────► contacts.get()
│ (check blocked)
│ not blocked
▼
fire onIncomingRequest[]
(UI shows dialog)
│
UI calls ────────────┤
acceptRequest() │
▼
contacts.put(accepted) ────► IndexedDB
socket.send(response)
subscribePresence()

chat_request_response ─────► handleChatRequestResponseFrame
│
├── accepted → contacts.update(accepted)
│ subscribePresence()
└── declined → contacts.update(declined)

presence ──────────────────► handlePresenceFrame
│
├── presenceCache.set()
└── fire onPresenceChange[]
(UI updates dots)

---

## Key Design Decisions

### Presence Is Never Persisted to IndexedDB

Writing a presence row on every `online/offline` event would thrash the database for no benefit — on every page load we reconnect and re-subscribe, so the server pushes fresh state within milliseconds. The `presenceCache` Map is the source of truth for the current session.

### Re-subscription on Reconnect

When the WebSocket reconnects after a drop, the server's in-memory presence subscription table is empty — our subscriptions were wiped with the session. `resubscribePresence()` runs automatically on every `init()` call, so the UI never needs to think about this.

### Auto-Accept Duplicate Requests

If a contact sends a second `chat_request` after both sides have already accepted (possible on their reconnect), `handleChatRequestFrame` detects `status === "accepted"` and responds silently with `accepted: true` without surfacing anything to the UI.

### Blocked Users Are Silent

Declined requests are not stored unless `block = true` is passed. A blocked user's future requests are dropped at the `handleChatRequestFrame` level without any UI notification and without sending a response frame — they get no signal that they are blocked.
