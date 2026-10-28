import { Router } from 'express';
import { storyController } from '../controllers/story.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createStorySchema } from '@infernux/shared';

const router = Router();

router.use(authenticate);

router.get('/feed', (req, res, next) => storyController.getFeed(req, res, next));
router.post('/', validateBody(createStorySchema), (req, res, next) =>
  storyController.createStory(req, res, next)
);
router.post('/:id/view', (req, res, next) => storyController.recordView(req, res, next));
router.get('/:id/viewers', (req, res, next) => storyController.getViewers(req, res, next));
router.delete('/:id', (req, res, next) => storyController.deleteStory(req, res, next));

export default router;

