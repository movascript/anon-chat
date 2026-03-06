import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { handleConnection } from './websocket/handler';
import { startCleanupJob } from './utils/cleanup';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

const server = app.listen(PORT, () => {
  console.log(`[Server] HTTP server running on port ${PORT}`);
});

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', handleConnection);

// Start cleanup job
startCleanupJob();

console.log('[Server] WebSocket server ready');
console.log('[Server] Cleanup job started');
