import { Router } from 'express';
import { communityController } from '../controllers/community.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  assignCommunityRoleSchema,
  createChannelSchema,
  createCommunityPostSchema,
  createCommunitySchema,
} from '@infernux/shared';

const router = Router();
router.use(authenticate);

router.get('/', (req, res, next) => communityController.listCommunities(req, res, next));
router.post('/', validateBody(createCommunitySchema), (req, res, next) =>
  communityController.createCommunity(req, res, next)
);
router.get('/:id', (req, res, next) => communityController.getCommunityDetail(req, res, next));
router.post('/:id/join', (req, res, next) => communityController.joinCommunity(req, res, next));
router.post('/:id/leave', (req, res, next) => communityController.leaveCommunity(req, res, next));
router.put('/:id/roles', validateBody(assignCommunityRoleSchema), (req, res, next) =>
  communityController.assignRole(req, res, next)
);
router.post('/:id/channels', validateBody(createChannelSchema), (req, res, next) =>
  communityController.createChannel(req, res, next)
);
router.get('/:id/channels/:channelId/posts', (req, res, next) =>
  communityController.listPosts(req, res, next)
);
router.post('/:id/channels/:channelId/posts', validateBody(createCommunityPostSchema), (req, res, next) =>
  communityController.createPost(req, res, next)
);
router.post('/:id/posts/:postId/pin', (req, res, next) =>
  communityController.togglePinPost(req, res, next)
);

export default router;
