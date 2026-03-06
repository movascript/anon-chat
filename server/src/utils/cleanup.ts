import { chatStore } from '../storage/chatStore';
import { inviteStore } from '../storage/inviteStore';

const INACTIVE_THRESHOLD = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function startCleanupJob() {
  setInterval(() => {
    console.log('[Cleanup] Running cleanup job...');

    // Clean inactive chats
    const inactiveChats = chatStore.getInactiveChats(INACTIVE_THRESHOLD);
    inactiveChats.forEach((chatId) => {
      console.log(`[Cleanup] Deleting inactive chat: ${chatId}`);
      chatStore.deleteChat(chatId);
    });

    // Clean expired invites
    inviteStore.cleanupExpired();

    console.log(`[Cleanup] Removed ${inactiveChats.length} inactive chats`);
  }, CLEANUP_INTERVAL);
}
