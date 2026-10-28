import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { postService } from '../services/post.service';
import { sendSuccess, getParam } from '../utils/response';

export class PostController {
  async createPost(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const post = await postService.createPost(req.userId!, req.body);
      sendSuccess(res, post, 'Post created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getFeed(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const feedType = (req.query.type as any) || 'chronological';
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const beforeCursor = req.query.beforeCursor as string | undefined;

      const result = await postService.getFeed(req.userId!, feedType, limit, beforeCursor);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async likePost(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const result = await postService.likePost(req.userId!, id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const comment = await postService.addComment(req.userId!, id, req.body);
      sendSuccess(res, comment, 'Comment added', 201);
    } catch (error) {
      next(error);
    }
  }

  async getComments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const comments = await postService.getComments(id, limit);
      sendSuccess(res, comments);
    } catch (error) {
      next(error);
    }
  }

  async toggleSavePost(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const isSaved = await postService.toggleSavePost(req.userId!, id);
      sendSuccess(res, { isSaved }, isSaved ? 'Post saved' : 'Post unsaved');
    } catch (error) {
      next(error);
    }
  }

  async getUserPosts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getParam(req.params.userId);
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const posts = await postService.getUserPosts(userId, req.userId, limit);
      sendSuccess(res, posts);
    } catch (error) {
      next(error);
    }
  }
}

export const postController = new PostController();
