// HTTP + WebSocket server bootstrap.
//
// Responsibilities:
//   - Create Express app for HTTP routes (health, stats)
//   - Attach WebSocket server to the same HTTP server
//   - Hand off each new WS connection to relay.ts
//   - Graceful shutdown on SIGTERM / SIGINT

import express from "express"
import cors from "cors"
import { createServer } from "http"
import { WebSocketServer, WebSocket } from "ws"
import { handleConnection } from "./relay"
import { store } from "./store"

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT        = Number(process.env.PORT)        || 3001
const CORS_ORIGIN = process.env.CORS_ORIGIN         || "http://localhost:5173"
const WS_PATH     = process.env.WS_PATH             || "/ws"

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express()

app.use(cors({
  origin     : CORS_ORIGIN,
  credentials: true,
}))

app.use(express.json())

// ── Health ────────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status   : "ok",
    uptime   : Math.floor(process.uptime()),
    timestamp: Date.now(),
  })
})

// ── Stats ─────────────────────────────────────────────────────────────────────

app.get("/stats", (_req, res) => {
  res.json(store.getStats())
})

// ── 404 catch-all ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" })
})

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const httpServer = createServer(app)

// ─── WebSocket Server ─────────────────────────────────────────────────────────

const wss = new WebSocketServer({
  server: httpServer,
  path  : WS_PATH,
})

wss.on("connection", (ws: WebSocket) => {
  handleConnection(ws)
})

wss.on("error", (err) => {
  console.error("[WSS] Server error:", err)
})

// ─── Startup ──────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[server] HTTP listening on port ${PORT}`)
  console.log(`[server] WebSocket accepting on ws://localhost:${PORT}${WS_PATH}`)
  console.log(`[server] CORS origin: ${CORS_ORIGIN}`)
})

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
//
// On SIGTERM (container stop) or SIGINT (ctrl+c):
//   1. Stop accepting new WS connections
//   2. Close all active sockets
//   3. Close HTTP server
//   4. Exit cleanly

function shutdown(signal: string): void {
  console.log(`\n[server] ${signal} received — shutting down`)

  // Stop accepting new connections
  wss.close(() => {
    console.log("[server] WebSocket server closed")
  })

  // Terminate all active WebSocket connections
  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.terminate()
    }
  }

  // Close HTTP server
  httpServer.close(() => {
    console.log("[server] HTTP server closed")
    process.exit(0)
  })

  // Force exit after 5s if something hangs
  setTimeout(() => {
    console.error("[server] Forced exit after timeout")
    process.exit(1)
  }, 5_000)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT",  () => shutdown("SIGINT"))
