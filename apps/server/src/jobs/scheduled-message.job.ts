import { chatService } from '../services/chat.service';
import { reelService } from '../services/reel.service';
import { experienceService } from '../services/experience.service';
import { logger } from '../utils/logger';

export function startMessagingJobs(intervalSeconds = 15): NodeJS.Timeout {
  logger.info(
    `Starting scheduled messages, reminders, capsules & reels publish job (running every ${intervalSeconds}s)`,
    'Jobs'
  );

  const runPass = async () => {
    await chatService.deliverDueScheduledMessages();
    await chatService.triggerDueReminders();
    await reelService.publishDueScheduledReels();
    await experienceService.unlockDueCapsules();
  };

  runPass().catch((err) => {
    logger.error('Error during initial messaging job pass', 'Jobs', err);
  });

  return setInterval(async () => {
    try {
      await runPass();
    } catch (err) {
      logger.error('Error executing messaging background jobs', 'Jobs', err);
    }
  }, intervalSeconds * 1000);
}
