import { Router } from 'express';
import { storyController } from '../controllers/story.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  createStorySchema,
  interactStoryStickerSchema,
  storyReactionSchema,
  createStoryHighlightSchema,
} from '@infernux/shared';

const router = Router();

router.use(authenticate);

router.get('/feed', (req, res, next) => storyController.getFeed(req, res, next));
router.get('/close-friends', (req, res, next) => storyController.getCloseFriends(req, res, next));
router.put('/close-friends/:friendId/toggle', (req, res, next) =>
  storyController.toggleCloseFriend(req, res, next)
);
router.get('/highlights/:userId', (req, res, next) => storyController.getHighlights(req, res, next));
router.post('/highlights', validateBody(createStoryHighlightSchema), (req, res, next) =>
  storyController.createHighlight(req, res, next)
);
router.delete('/highlights/:highlightId', (req, res, next) =>
  storyController.deleteHighlight(req, res, next)
);
router.post('/', validateBody(createStorySchema), (req, res, next) =>
  storyController.createStory(req, res, next)
);
router.post('/:id/view', (req, res, next) => storyController.recordView(req, res, next));
router.get('/:id/viewers', (req, res, next) => storyController.getViewers(req, res, next));
router.post('/:id/react', validateBody(storyReactionSchema), (req, res, next) =>
  storyController.reactStory(req, res, next)
);
router.post('/:id/stickers/:stickerId/interact', validateBody(interactStoryStickerSchema), (req, res, next) =>
  storyController.interactSticker(req, res, next)
);
router.post('/:id/collaborate', (req, res, next) => storyController.addCollaborator(req, res, next));
router.delete('/:id', (req, res, next) => storyController.deleteStory(req, res, next));

export default router;

