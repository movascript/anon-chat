export interface Message {
  id: string;
  content: string;
  isSent: boolean;
  timestamp: number;
}

export interface ChatState {
  chatId: string | null;
  partnerId: string | null;
  messages: Message[];
  isConnected: boolean;
  isPartnerTyping: boolean;
  inviteUrl: string | null;
}

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
