import { storyService } from '../services/story.service';
import { logger } from '../utils/logger';

export function startStoryCleanupJob(intervalMinutes = 15): NodeJS.Timeout {
  logger.info(`Starting story cleanup background job (running every ${intervalMinutes}m)`, 'Jobs');

  // Run initial pass
  storyService.cleanupExpiredStories().catch((err) => {
    logger.error('Error during initial story cleanup pass', 'Jobs', err);
  });

  return setInterval(async () => {
    try {
      const count = await storyService.cleanupExpiredStories();
      if (count > 0) {
        logger.info(`Expired ${count} stories in scheduled cleanup pass`, 'Jobs');
      }
    } catch (err) {
      logger.error('Error executing scheduled story cleanup job', 'Jobs', err);
    }
  }, intervalMinutes * 60 * 1000);
}
