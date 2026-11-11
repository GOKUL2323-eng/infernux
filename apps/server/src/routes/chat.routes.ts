import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  sendMessageSchema,
  editMessageSchema,
  addReactionSchema,
  createConversationSchema,
  pinMessageSchema,
  forwardMessageSchema,
  interactMessageSchema,
  createReminderSchema,
  savePersonalMessageSchema,
  syncDraftSchema,
  translateMessageSchema,
  createChatFolderSchema,
  updateConversationPrefsSchema,
  updateStreakSettingsSchema,
} from '@infernux/shared';

const router = Router();

router.use(authenticate);

// Conversations & Preferences
router.get('/conversations', (req, res, next) => chatController.getConversations(req, res, next));
router.post('/conversations', validateBody(createConversationSchema), (req, res, next) =>
  chatController.createConversation(req, res, next)
);
router.patch('/conversations/:id/preferences', validateBody(updateConversationPrefsSchema), (req, res, next) =>
  chatController.updateConversationPrefs(req, res, next)
);
router.get('/conversations/:id/draft', (req, res, next) => chatController.getDraft(req, res, next));
router.put('/conversations/:id/draft', validateBody(syncDraftSchema), (req, res, next) =>
  chatController.syncDraft(req, res, next)
);
router.get('/conversations/:id/scheduled', (req, res, next) =>
  chatController.getScheduledMessages(req, res, next)
);
router.delete('/scheduled/:messageId', (req, res, next) =>
  chatController.cancelScheduledMessage(req, res, next)
);

// Saved Messages, Reminders, Folders, Streaks (static prefixes)
router.get('/saved-messages', (req, res, next) => chatController.getSavedMessages(req, res, next));
router.get('/reminders', (req, res, next) => chatController.getReminders(req, res, next));
router.delete('/reminders/:reminderId', (req, res, next) =>
  chatController.dismissReminder(req, res, next)
);
router.get('/folders', (req, res, next) => chatController.getFolders(req, res, next));
router.post('/folders', validateBody(createChatFolderSchema), (req, res, next) =>
  chatController.createFolder(req, res, next)
);
router.patch('/folders/:folderId', validateBody(createChatFolderSchema.partial()), (req, res, next) =>
  chatController.updateFolder(req, res, next)
);
router.delete('/folders/:folderId', (req, res, next) => chatController.deleteFolder(req, res, next));
router.get('/streaks', (req, res, next) => chatController.getStreaks(req, res, next));
router.post('/streaks/:streakId/recover', (req, res, next) =>
  chatController.recoverStreak(req, res, next)
);
router.patch('/streaks/:streakId/settings', validateBody(updateStreakSettingsSchema), (req, res, next) =>
  chatController.updateStreakSettings(req, res, next)
);

// Messages & Smart/Interactive actions
router.get('/conversations/:id/messages', (req, res, next) =>
  chatController.getMessages(req, res, next)
);
router.post('/conversations/:id/messages', validateBody(sendMessageSchema.omit({ conversationId: true })), (req, res, next) =>
  chatController.sendMessage(req, res, next)
);
router.patch('/messages/:id', validateBody(editMessageSchema), (req, res, next) =>
  chatController.editMessage(req, res, next)
);
router.delete('/messages/:id', (req, res, next) => chatController.deleteMessage(req, res, next));
router.post('/messages/:id/pin', validateBody(pinMessageSchema), (req, res, next) =>
  chatController.pinMessage(req, res, next)
);
router.post('/messages/:id/forward', validateBody(forwardMessageSchema), (req, res, next) =>
  chatController.forwardMessage(req, res, next)
);
router.post('/messages/:id/interact', validateBody(interactMessageSchema), (req, res, next) =>
  chatController.interactMessage(req, res, next)
);
router.post('/messages/:id/reactions', validateBody(addReactionSchema), (req, res, next) =>
  chatController.addReaction(req, res, next)
);
router.post('/messages/:id/secret-reactions', validateBody(addReactionSchema), (req, res, next) =>
  chatController.addSecretReaction(req, res, next)
);
router.post('/messages/:id/secret-reactions/reveal', (req, res, next) =>
  chatController.revealSecretReaction(req, res, next)
);
router.post('/messages/:id/translate', validateBody(translateMessageSchema), (req, res, next) =>
  chatController.translateMessage(req, res, next)
);
router.post('/messages/:id/transcribe', (req, res, next) =>
  chatController.transcribeMessage(req, res, next)
);
router.post('/messages/:id/save-personal', validateBody(savePersonalMessageSchema), (req, res, next) =>
  chatController.savePersonalMessage(req, res, next)
);
router.delete('/messages/:id/save-personal', (req, res, next) =>
  chatController.unsavePersonalMessage(req, res, next)
);
router.post('/messages/:id/reminders', validateBody(createReminderSchema), (req, res, next) =>
  chatController.createReminder(req, res, next)
);
router.post('/messages/:messageId/consume-view-once', (req, res, next) =>
  chatController.consumeViewOnce(req, res, next)
);
router.post('/messages/:messageId/save-media', (req, res, next) =>
  chatController.saveMedia(req, res, next)
);
router.post('/conversations/:id/read', (req, res, next) =>
  chatController.markAsRead(req, res, next)
);

export default router;

