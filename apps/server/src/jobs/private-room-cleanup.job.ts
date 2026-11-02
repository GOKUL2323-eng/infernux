import { chatService } from '../services/chat.service';
import { logger } from '../utils/logger';

export function startPrivateRoomCleanupJob(intervalSeconds = 30): NodeJS.Timeout {
  logger.info(`Starting private room message auto-deletion job (running every ${intervalSeconds}s)`, 'Jobs');

  // Run initial pass
  chatService.cleanupExpiredPrivateMessages().catch((err) => {
    logger.error('Error during initial private message cleanup pass', 'Jobs', err);
  });

  return setInterval(async () => {
    try {
      await chatService.cleanupExpiredPrivateMessages();
    } catch (err) {
      logger.error('Error executing scheduled private message cleanup job', 'Jobs', err);
    }
  }, intervalSeconds * 1000);
}

