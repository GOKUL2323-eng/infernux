import { Router } from 'express';
import { postController } from '../controllers/post.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createPostSchema, addCommentSchema } from '@infernux/shared';

const router = Router();

router.use(authenticate);

router.get('/feed', (req, res, next) => postController.getFeed(req, res, next));
router.post('/', validateBody(createPostSchema), (req, res, next) =>
  postController.createPost(req, res, next)
);
router.post('/:id/like', (req, res, next) => postController.likePost(req, res, next));
router.get('/:id/comments', (req, res, next) => postController.getComments(req, res, next));
router.post('/:id/comments', validateBody(addCommentSchema), (req, res, next) =>
  postController.addComment(req, res, next)
);
router.post('/:id/save', (req, res, next) => postController.toggleSavePost(req, res, next));
router.get('/user/:userId', (req, res, next) => postController.getUserPosts(req, res, next));
router.delete('/:id', (req, res, next) => postController.deletePost(req, res, next));

export default router;

