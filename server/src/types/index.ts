export interface User {
  id: string;
  socketId: string;
  publicKey: string | null;
  connectedAt: number;
  isOnline: boolean;
}

export interface Chat {
  id: string;
  createdAt: number;
  userA: User | null;
  userB: User | null;
  lastActivity: number;
}

export interface Invite {
  token: string;
  chatId: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

export interface Connection {
  userId: string;
  chatId: string | null;
}

// WebSocket Message Types
export type WSMessageType =
  | 'create_chat'
  | 'join_chat'
  | 'key_exchange'
  | 'message'
  | 'typing'
  | 'user_joined'
  | 'user_left'
  | 'error'
  | 'chat_ready';

export interface WSMessage {
  type: WSMessageType;
  payload: any;
  timestamp: number;
  nonce?: string;
}

export interface CreateChatPayload {
  userId: string;
  publicKey: string;
}

export interface JoinChatPayload {
  token: string;
  userId: string;
  publicKey: string;
}

export interface KeyExchangePayload {
  chatId: string;
  publicKey: string;
}

export interface MessagePayload {
  chatId: string;
  ciphertext: string;
  iv: string;
}

export interface TypingPayload {
  chatId: string;
  isTyping: boolean;
}
