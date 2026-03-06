import WebSocket from 'ws';
import crypto from 'crypto';
import { chatStore } from '../storage/chatStore';
import { inviteStore } from '../storage/inviteStore';
import type {
  WSMessage,
  CreateChatPayload,
  JoinChatPayload,
  MessagePayload,
  TypingPayload,
  User,
  Connection,
  KeyExchangePayload,
} from '../types';

const connections = new Map<string, Connection>();
const socketMap = new Map<string, WebSocket>();
const nonces = new Set<string>();

export function handleConnection(ws: WebSocket) {
  const socketId = crypto.randomUUID();
  
  console.log(`[WS] New connection: ${socketId}`);

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      
      // Nonce validation (anti-replay)
      if (message.nonce) {
        if (nonces.has(message.nonce)) {
          sendError(ws, 'Duplicate nonce detected');
          return;
        }
        nonces.add(message.nonce);
        
        // Cleanup old nonces (keep last 1000)
        if (nonces.size > 1000) {
          const first = nonces.values().next().value;
          if (first) nonces.delete(first);
        }
      }

      handleMessage(ws, socketId, message);
    } catch (error) {
      console.error('[WS] Parse error:', error);
      sendError(ws, 'Invalid message format');
    }
  });

  ws.on('close', () => {
    handleDisconnect(socketId);
  });

  ws.on('error', (error) => {
    console.error(`[WS] Socket error ${socketId}:`, error);
  });

  socketMap.set(socketId, ws);
}

function handleMessage(ws: WebSocket, socketId: string, message: WSMessage) {
  console.log(`[WS] Message type: ${message.type}`);

  switch (message.type) {
    case 'create_chat':
      handleCreateChat(ws, socketId, message.payload);
      break;
    case 'join_chat':
      handleJoinChat(ws, socketId, message.payload);
      break;
    case 'key_exchange':
      handleKeyExchange(socketId, message.payload);
      break;
    case 'message':
      handleChatMessage(socketId, message.payload);
      break;
    case 'typing':
      handleTyping(socketId, message.payload);
      break;
    default:
      sendError(ws, 'Unknown message type');
  }
}

function handleCreateChat(ws: WebSocket, socketId: string, payload: CreateChatPayload) {
  const chatId = crypto.randomUUID();
  const chat = chatStore.createChat(chatId);

  const user: User = {
    id: payload.userId,
    socketId,
    publicKey: payload.publicKey,
    connectedAt: Date.now(),
    isOnline: true,
  };

  chatStore.addUserToChat(chatId, user);

  connections.set(socketId, {
    userId: payload.userId,
    chatId,
  });

  const inviteToken = inviteStore.createInvite(chatId);

  sendMessage(ws, {
    type: 'create_chat',
    payload: {
      chatId,
      inviteToken,
      inviteUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${inviteToken}`,
    },
    timestamp: Date.now(),
  });

  console.log(`[Chat] Created: ${chatId}`);
}

function handleJoinChat(ws: WebSocket, socketId: string, payload: JoinChatPayload) {
  const chatId = inviteStore.useInvite(payload.token);

  if (!chatId) {
    sendError(ws, 'Invalid or expired invite token');
    return;
  }

  const chat = chatStore.getChat(chatId);
  if (!chat) {
    sendError(ws, 'Chat not found');
    return;
  }

  if (chatStore.isChatFull(chatId)) {
    sendError(ws, 'Chat is full');
    return;
  }

  const user: User = {
    id: payload.userId,
    socketId,
    publicKey: payload.publicKey,
    connectedAt: Date.now(),
    isOnline: true,
  };

  chatStore.addUserToChat(chatId, user);

  connections.set(socketId, {
    userId: payload.userId,
    chatId,
  });

  // Notify both users that chat is ready
  const partner = chatStore.getPartner(chatId, payload.userId);
  if (partner && partner.socketId) {
    const partnerSocket = socketMap.get(partner.socketId);
    if (partnerSocket) {
      sendMessage(partnerSocket, {
        type: 'user_joined',
        payload: {
          userId: payload.userId,
          publicKey: payload.publicKey,
        },
        timestamp: Date.now(),
      });
    }
  }

  sendMessage(ws, {
    type: 'chat_ready',
    payload: {
      chatId,
      partnerId: partner?.id,
      partnerPublicKey: partner?.publicKey,
    },
    timestamp: Date.now(),
  });

  console.log(`[Chat] User joined: ${chatId}`);
}

function handleKeyExchange(socketId: string, payload: KeyExchangePayload) {
  const connection = connections.get(socketId);
  if (!connection || !connection.chatId) return;

  const partner = chatStore.getPartner(connection.chatId, connection.userId);
  if (!partner || !partner.socketId) return;

  const partnerSocket = socketMap.get(partner.socketId);
  if (!partnerSocket) return;

  sendMessage(partnerSocket, {
    type: 'key_exchange',
    payload: {
      publicKey: payload.publicKey,
    },
    timestamp: Date.now(),
  });
}

function handleChatMessage(socketId: string, payload: MessagePayload) {
  const connection = connections.get(socketId);
  if (!connection || !connection.chatId) return;

  chatStore.updateActivity(payload.chatId);

  const partner = chatStore.getPartner(connection.chatId, connection.userId);
  if (!partner || !partner.socketId) return;

  const partnerSocket = socketMap.get(partner.socketId);
  if (!partnerSocket) return;

  sendMessage(partnerSocket, {
    type: 'message',
    payload: {
      ciphertext: payload.ciphertext,
      iv: payload.iv,
    },
    timestamp: Date.now(),
  });
}

function handleTyping(socketId: string, payload: TypingPayload) {
  const connection = connections.get(socketId);
  if (!connection || !connection.chatId) return;

  const partner = chatStore.getPartner(connection.chatId, connection.userId);
  if (!partner || !partner.socketId) return;

  const partnerSocket = socketMap.get(partner.socketId);
  if (!partnerSocket) return;

  sendMessage(partnerSocket, {
    type: 'typing',
    payload: {
      isTyping: payload.isTyping,
    },
    timestamp: Date.now(),
  });
}

function handleDisconnect(socketId: string) {
  const connection = connections.get(socketId);
  
  if (connection && connection.chatId) {
    const partner = chatStore.getPartner(connection.chatId, connection.userId);
    
    chatStore.removeUserFromChat(connection.chatId, connection.userId);
    
    if (partner && partner.socketId) {
      const partnerSocket = socketMap.get(partner.socketId);
      if (partnerSocket) {
        sendMessage(partnerSocket, {
          type: 'user_left',
          payload: {},
          timestamp: Date.now(),
        });
      }
    }
  }

  connections.delete(socketId);
  socketMap.delete(socketId);
  
  console.log(`[WS] Disconnected: ${socketId}`);
}

function sendMessage(ws: WebSocket, message: WSMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws: WebSocket, error: string) {
  sendMessage(ws, {
    type: 'error',
    payload: { error },
    timestamp: Date.now(),
  });
}
