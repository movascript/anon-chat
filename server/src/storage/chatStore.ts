import { Chat, User } from '../types';

class ChatStore {
  private chats = new Map<string, Chat>();

  createChat(chatId: string): Chat {
    const chat: Chat = {
      id: chatId,
      createdAt: Date.now(),
      userA: null,
      userB: null,
      lastActivity: Date.now(),
    };
    
    this.chats.set(chatId, chat);
    return chat;
  }

  getChat(chatId: string): Chat | undefined {
    return this.chats.get(chatId);
  }

  addUserToChat(chatId: string, user: User): boolean {
    const chat = this.chats.get(chatId);
    if (!chat) return false;

    if (!chat.userA) {
      chat.userA = user;
    } else if (!chat.userB) {
      chat.userB = user;
    } else {
      return false; // Chat is full
    }

    chat.lastActivity = Date.now();
    return true;
  }

  removeUserFromChat(chatId: string, userId: string): void {
    const chat = this.chats.get(chatId);
    if (!chat) return;

    if (chat.userA?.id === userId) {
      chat.userA = null;
    } else if (chat.userB?.id === userId) {
      chat.userB = null;
    }

    // If both users left, delete the chat
    if (!chat.userA && !chat.userB) {
      this.chats.delete(chatId);
    }
  }

  updateActivity(chatId: string): void {
    const chat = this.chats.get(chatId);
    if (chat) {
      chat.lastActivity = Date.now();
    }
  }

  getInactiveChats(threshold: number): string[] {
    const now = Date.now();
    const inactive: string[] = [];

    this.chats.forEach((chat, id) => {
      if (now - chat.lastActivity > threshold) {
        inactive.push(id);
      }
    });

    return inactive;
  }

  deleteChat(chatId: string): void {
    this.chats.delete(chatId);
  }

  isChatFull(chatId: string): boolean {
    const chat = this.chats.get(chatId);
    return chat ? !!(chat.userA && chat.userB) : false;
  }

  getPartner(chatId: string, userId: string): User | null {
    const chat = this.chats.get(chatId);
    if (!chat) return null;

    if (chat.userA?.id === userId) return chat.userB;
    if (chat.userB?.id === userId) return chat.userA;
    return null;
  }

  getAllChats(): Chat[] {
    return Array.from(this.chats.values());
  }
}

export const chatStore = new ChatStore();
