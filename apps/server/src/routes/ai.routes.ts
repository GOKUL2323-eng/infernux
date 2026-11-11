import { Router } from 'express';
import { aiChatSuggestSchema, aiContentAssistSchema } from '@infernux/shared';
import { aiController } from '../controllers/ai.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';

const router = Router();

router.use(authenticate);

router.post('/summarize', validateBody(aiChatSuggestSchema), (req, res, next) =>
  aiController.summarizeConversation(req, res, next)
);

router.post('/replies', validateBody(aiChatSuggestSchema), (req, res, next) =>
  aiController.suggestReplies(req, res, next)
);

router.post('/content-assist', validateBody(aiContentAssistSchema), (req, res, next) =>
  aiController.generateContentAssist(req, res, next)
);

export default router;
