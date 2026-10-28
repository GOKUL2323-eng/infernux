import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  sendMessageSchema,
  editMessageSchema,
  addReactionSchema,
  createConversationSchema,
} from '@infernux/shared';

const router = Router();

router.use(authenticate);

router.get('/conversations', (req, res, next) => chatController.getConversations(req, res, next));
router.post('/conversations', validateBody(createConversationSchema), (req, res, next) =>
  chatController.createConversation(req, res, next)
);
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
router.post('/messages/:id/reactions', validateBody(addReactionSchema), (req, res, next) =>
  chatController.addReaction(req, res, next)
);
router.post('/conversations/:id/read', (req, res, next) =>
  chatController.markAsRead(req, res, next)
);

export default router;

