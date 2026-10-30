import { Router } from 'express';
import { reelController } from '../controllers/reel.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createReelSchema, addReelCommentSchema } from '@infernux/shared';

const router = Router();

router.get('/feed', optionalAuthenticate, (req, res, next) =>
  reelController.getFeed(req, res, next)
);
router.post('/', authenticate, validateBody(createReelSchema), (req, res, next) =>
  reelController.createReel(req, res, next)
);
router.post('/:id/like', authenticate, (req, res, next) =>
  reelController.likeReel(req, res, next)
);
router.post('/:id/save', authenticate, (req, res, next) =>
  reelController.saveReel(req, res, next)
);
router.post('/:id/view', optionalAuthenticate, (req, res, next) =>
  reelController.recordView(req, res, next)
);
router.get('/:id/comments', optionalAuthenticate, (req, res, next) =>
  reelController.getComments(req, res, next)
);
router.post('/:id/comments', authenticate, validateBody(addReelCommentSchema), (req, res, next) =>
  reelController.addComment(req, res, next)
);
router.get('/user/:userId', optionalAuthenticate, (req, res, next) =>
  reelController.getUserReels(req, res, next)
);

export default router;

