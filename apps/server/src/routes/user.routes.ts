import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  updateProfileSchema,
  updatePrivacySchema,
  updateNotificationsSchema,
} from '@infernux/shared';

const router = Router();

router.get('/profile/:username', optionalAuthenticate, (req, res, next) =>
  userController.getProfile(req, res, next)
);
router.patch('/profile', authenticate, validateBody(updateProfileSchema), (req, res, next) =>
  userController.updateProfile(req, res, next)
);
router.patch('/privacy', authenticate, validateBody(updatePrivacySchema), (req, res, next) =>
  userController.updatePrivacy(req, res, next)
);
router.patch('/notifications', authenticate, validateBody(updateNotificationsSchema), (req, res, next) =>
  userController.updateNotifications(req, res, next)
);
router.get('/search', optionalAuthenticate, (req, res, next) =>
  userController.searchUsers(req, res, next)
);
router.get('/blocked', authenticate, (req, res, next) =>
  userController.getBlockedUsers(req, res, next)
);
router.get('/:id/followers', optionalAuthenticate, (req, res, next) =>
  userController.getFollowers(req, res, next)
);
router.get('/:id/following', optionalAuthenticate, (req, res, next) =>
  userController.getFollowing(req, res, next)
);
router.post('/:id/follow', authenticate, (req, res, next) =>
  userController.followUser(req, res, next)
);
router.delete('/:id/unfollow', authenticate, (req, res, next) =>
  userController.unfollowUser(req, res, next)
);
router.post('/follow-requests/:id/accept', authenticate, (req, res, next) =>
  userController.acceptFollowRequest(req, res, next)
);
router.delete('/follow-requests/:id/reject', authenticate, (req, res, next) =>
  userController.rejectFollowRequest(req, res, next)
);
router.post('/:id/block', authenticate, (req, res, next) =>
  userController.blockUser(req, res, next)
);
router.delete('/:id/unblock', authenticate, (req, res, next) =>
  userController.unblockUser(req, res, next)
);

export default router;

