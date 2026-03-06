import { Invite } from '../types';
import crypto from 'crypto';

class InviteStore {
  private invites = new Map<string, Invite>();

  createInvite(chatId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const invite: Invite = {
      token,
      chatId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      used: false,
    };

    this.invites.set(token, invite);
    return token;
  }

  getInvite(token: string): Invite | undefined {
    return this.invites.get(token);
  }

  useInvite(token: string): string | null {
    const invite = this.invites.get(token);

    if (!invite) return null;
    if (invite.used) return null;
    if (Date.now() > invite.expiresAt) {
      this.invites.delete(token);
      return null;
    }

    invite.used = true;
    return invite.chatId;
  }

  deleteInvite(token: string): void {
    this.invites.delete(token);
  }

  cleanupExpired(): void {
    const now = Date.now();
    this.invites.forEach((invite, token) => {
      if (now > invite.expiresAt) {
        this.invites.delete(token);
      }
    });
  }
}

export const inviteStore = new InviteStore();
