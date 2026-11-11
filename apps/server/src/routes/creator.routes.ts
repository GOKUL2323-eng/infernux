import { Router } from 'express';
import { creatorController } from '../controllers/creator.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/analytics', (req, res, next) => creatorController.getAnalytics(req, res, next));
router.get('/drafts', (req, res, next) => creatorController.getStudioQueue(req, res, next));
router.post('/reels/:id/publish', (req, res, next) =>
  creatorController.publishDraft(req, res, next)
);

export default router;

