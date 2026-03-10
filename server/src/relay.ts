
import { store } from "./store.js"
import { serverCrypto } from "./crypto.js"
import type {
  IncomingFrame,
  AuthFrame,
  SearchUserFrame,
  ChatRequestFrame,
  ChatAcceptFrame,
  ChatDeclineFrame,
  MessageFrame,
  TypingFrame,
  OutgoingFrame,
} from "./types.js"
import type { WebSocket } from "ws"

// ─── Entry Point ──────────────────────────────────────────────────────────────

export function handleConnection(ws: WebSocket): void {
  const nonce    = serverCrypto.generateNonce()
  const socketID = store.registerSocket(ws, nonce)

  // Issue challenge immediately — client must auth before anything else
  // NOTE: use store.sendToSocket here, not a bare `send()` helper
  store.sendToSocket(socketID, {
    type : "challenge",
    id   : crypto.randomUUID(),
    ts   : Date.now(),
    nonce,
  })

  ws.on("message", (raw) => {
    handleRawMessage(socketID, raw.toString())
  })

  ws.on("close", () => {
    handleDisconnect(socketID)
  })

  ws.on("error", () => {
    handleDisconnect(socketID)
  })
}

// ─── Raw Message Parser ───────────────────────────────────────────────────────

function handleRawMessage(socketID: string, raw: string): void {
  let frame: IncomingFrame

  try {
    frame = JSON.parse(raw) as IncomingFrame
  } catch {
    sendError(socketID, "Malformed JSON")
    return
  }

  if (!frame.type || typeof frame.type !== "string") {
    sendError(socketID, "Missing or invalid frame type")
    return
  }

  const client = store.getClientBySocketID(socketID)
  if (!client) return

  if (!client.authenticated && frame.type !== "auth") {
    sendError(socketID, "Not authenticated")
    return
  }

  routeFrame(socketID, frame)
}

// ─── Frame Router ─────────────────────────────────────────────────────────────

// Return type is `void | Promise<void>` because handleAuth is async.
// Callers never await routeFrame — fire-and-forget is intentional here.
function routeFrame(socketID: string, frame: IncomingFrame): void | Promise<void> {
  switch (frame.type) {
    case "auth":         return handleAuth(socketID, frame)
    case "search_user":  return handleSearchUser(socketID, frame)
    case "chat_request": return handleChatRequest(socketID, frame)
    case "chat_accept":  return handleChatAccept(socketID, frame)
    case "chat_decline": return handleChatDecline(socketID, frame)
    case "message":      return handleMessage(socketID, frame)
    case "typing":       return handleTyping(socketID, frame)
    default: {
      sendError(socketID, "Unknown frame type")
    }
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function handleAuth(socketID: string, frame: AuthFrame): Promise<void> {
  const client = store.getClientBySocketID(socketID)
  if (!client) return

  if (client.authenticated) {
    sendError(socketID, "Already authenticated")
    return
  }

  if (!client.pendingNonce) {
    sendError(socketID, "No pending challenge")
    return
  }

  const { username, publicKey, signature } = frame

  // ── Username validation ───────────────────────────────────────────────────

  if (!isValidUsername(username)) {
    store.sendToSocket(socketID, {
      type  : "auth_error",
      id    : crypto.randomUUID(),
      ts    : Date.now(),
      reason: "Username must be 3–32 characters, alphanumeric and underscores only",
    })
    return
  }

  // ── Key import ────────────────────────────────────────────────────────────

  let cryptoKey: CryptoKey

  try {
    cryptoKey = await serverCrypto.importPublicKey(publicKey)
  } catch (err) {
    store.sendToSocket(socketID, {
      type  : "auth_error",
      id    : crypto.randomUUID(),
      ts    : Date.now(),
      reason: `Invalid public key: ${String(err)}`,
    })
    return
  }

  // ── Signature verification ────────────────────────────────────────────────

  const valid = await serverCrypto.verifySignature(
    cryptoKey,
    client.pendingNonce,
    signature,
  )

  if (!valid) {
    store.sendToSocket(socketID, {
      type  : "auth_error",
      id    : crypto.randomUUID(),
      ts    : Date.now(),
      reason: "Signature verification failed",
    })
    return
  }

  // ── Promote client ────────────────────────────────────────────────────────

  const userID  = await serverCrypto.deriveUserID(publicKey)
  const success = store.authenticateClient(socketID, userID, username, publicKey)

  if (!success) {
    store.sendToSocket(socketID, {
      type  : "auth_error",
      id    : crypto.randomUUID(),
      ts    : Date.now(),
      reason: "Username already taken",
    })
    return
  }

  store.sendToSocket(socketID, {
    type    : "auth_success",
    id      : crypto.randomUUID(),
    ts      : Date.now(),
    username,
    userID,
  })

  // Reconnecting user — notify any existing subscribers they are back online
  broadcastPresence(userID, username, true)
}

// ─── Search ───────────────────────────────────────────────────────────────────

function handleSearchUser(socketID: string, frame: SearchUserFrame): void {
  const target = store.getClientByUsername(frame.username)

  if (!target || !target.authenticated) {
    store.sendToSocket(socketID, {
      type    : "search_result",
      id      : crypto.randomUUID(),
      ts      : Date.now(),
      username: frame.username,
      found   : false,
      online  : false,
    })
    return
  }

  store.sendToSocket(socketID, {
    type     : "search_result",
    id       : crypto.randomUUID(),
    ts       : Date.now(),
    username : target.username,
    found    : true,
    online   : true,
    userID   : target.userID,
    publicKey: target.publicKey,
  })
}

// ─── Chat Request ─────────────────────────────────────────────────────────────

function handleChatRequest(socketID: string, frame: ChatRequestFrame): void {
  const sender = store.getClientBySocketID(socketID)
  if (!sender) return

  const target = store.getClientByUserID(frame.toUserID)

  if (!target || !target.authenticated) {
    store.sendToSocket(socketID, {
      type      : "message_ack",
      id        : crypto.randomUUID(),
      ts        : Date.now(),
      originalID: frame.id,
      delivered : false,
      reason    : "offline",
    })
    return
  }

  // Subscribe sender to target's presence
  store.subscribeToPresence(socketID, frame.toUserID)

  store.sendToUserID(frame.toUserID, {
    type        : "chat_request_in",
    id          : crypto.randomUUID(),
    ts          : Date.now(),
    fromUserID  : sender.userID,
    fromUsername: sender.username,
  })
}

// ─── Chat Accept / Decline ────────────────────────────────────────────────────

function handleChatAccept(socketID: string, frame: ChatAcceptFrame): void {
  const acceptor = store.getClientBySocketID(socketID)
  if (!acceptor) return

  // Subscribe both sides to each other's presence
  store.subscribeToPresence(socketID, frame.toUserID)

  const targetSocketID = store.getSocketIDByUserID(frame.toUserID)
  if (targetSocketID) {
    store.subscribeToPresence(targetSocketID, acceptor.userID)
  }

  store.sendToUserID(frame.toUserID, {
    type      : "chat_response",
    id        : crypto.randomUUID(),
    ts        : Date.now(),
    fromUserID: acceptor.userID,
    accepted  : true,
  })
}

function handleChatDecline(socketID: string, frame: ChatDeclineFrame): void {
  const decliner = store.getClientBySocketID(socketID)
  if (!decliner) return

  store.sendToUserID(frame.toUserID, {
    type      : "chat_response",
    id        : crypto.randomUUID(),
    ts        : Date.now(),
    fromUserID: decliner.userID,
    accepted  : false,
  })
}

// ─── Message ──────────────────────────────────────────────────────────────────

function handleMessage(socketID: string, frame: MessageFrame): void {
  const sender = store.getClientBySocketID(socketID)
  if (!sender) return

  const delivered = store.sendToUserID(frame.toUserID, {
    type          : "message_in",
    id            : crypto.randomUUID(),
    ts            : Date.now(),
    fromUserID    : sender.userID,
    fromUsername  : sender.username,
    content       : frame.content,
    conversationID: frame.conversationID,
    originalID    : frame.id,
  })

  store.sendToSocket(socketID, {
    type      : "message_ack",
    id        : crypto.randomUUID(),
    ts        : Date.now(),
    originalID: frame.id,
    delivered,
    reason    : delivered ? undefined : "offline",
  })
}

// ─── Typing ───────────────────────────────────────────────────────────────────

function handleTyping(socketID: string, frame: TypingFrame): void {
  const sender = store.getClientBySocketID(socketID)
  if (!sender) return

  store.sendToUserID(frame.toUserID, {
    type      : "typing_in",
    id        : crypto.randomUUID(),
    ts        : Date.now(),
    fromUserID: sender.userID,
    isTyping  : frame.isTyping,
  })
}

// ─── Disconnect ───────────────────────────────────────────────────────────────

function handleDisconnect(socketID: string): void {
  const removed = store.removeClient(socketID)
  if (!removed || !removed.authenticated) return

  store.removeAllSubscriptions(socketID)
  broadcastPresence(removed.userID, removed.username, false)
}

// ─── Presence Broadcast ───────────────────────────────────────────────────────

function broadcastPresence(
  userID  : string,
  username: string,
  online  : boolean,
): void {
  const subscribers = store.getPresenceSubscribers(userID)
  if (subscribers.length === 0) return

  const frame: OutgoingFrame = {
    type    : "presence",
    id      : crypto.randomUUID(),
    ts      : Date.now(),
    userID,
    username,
    online,
  }

  for (const watcherSocketID of subscribers) {
    store.sendToSocket(watcherSocketID, frame)
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,32}$/.test(username)
}

/**
 * Send a generic error frame to a socket.
 * Used for protocol-level mistakes (bad JSON, wrong frame type, not authed).
 * Not the same as domain errors like auth_error — those are sent inline.
 */
function sendError(socketID: string, reason: string): void {
  store.sendToSocket(socketID, {
    type  : "error",
    id    : crypto.randomUUID(),
    ts    : Date.now(),
    reason,
  })
}
