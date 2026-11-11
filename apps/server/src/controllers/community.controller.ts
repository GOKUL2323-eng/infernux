import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { communityService } from '../services/community.service';
import { sendSuccess, getParam } from '../utils/response';

export class CommunityController {
  async createCommunity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await communityService.createCommunity(req.userId!, req.body);
      sendSuccess(res, data, 'Community created', 201);
    } catch (error) {
      next(error);
    }
  }

  async listCommunities(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      const query = req.query.q as string | undefined;
      const mineOnly = req.query.mine === 'true';
      const data = await communityService.listCommunities(req.userId!, {
        category,
        query,
        mineOnly,
      });
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getCommunityDetail(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await communityService.getCommunityDetail(getParam(req.params.id), req.userId!);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async joinCommunity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await communityService.joinCommunity(getParam(req.params.id), req.userId!);
      sendSuccess(res, data, 'Joined community');
    } catch (error) {
      next(error);
    }
  }

  async leaveCommunity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await communityService.leaveCommunity(getParam(req.params.id), req.userId!);
      sendSuccess(res, data, 'Left community');
    } catch (error) {
      next(error);
    }
  }

  async assignRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await communityService.assignRole(getParam(req.params.id), req.userId!, req.body);
      sendSuccess(res, data, 'Member role updated');
    } catch (error) {
      next(error);
    }
  }

  async createChannel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await communityService.createChannel(
        getParam(req.params.id),
        req.userId!,
        req.body
      );
      sendSuccess(res, data, 'Channel created', 201);
    } catch (error) {
      next(error);
    }
  }

  async createPost(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await communityService.createPost(
        getParam(req.params.id),
        getParam(req.params.channelId),
        req.userId!,
        req.body
      );
      sendSuccess(res, data, 'Post created', 201);
    } catch (error) {
      next(error);
    }
  }

  async listPosts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query.q as string | undefined;
      const parentPostId = req.query.parentPostId as string | undefined;
      const data = await communityService.listPosts(
        getParam(req.params.id),
        getParam(req.params.channelId),
        { query, parentPostId }
      );
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async togglePinPost(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await communityService.togglePinPost(
        getParam(req.params.id),
        getParam(req.params.postId),
        req.userId!
      );
      sendSuccess(res, data, data.pinned ? 'Post pinned' : 'Post unpinned');
    } catch (error) {
      next(error);
    }
  }
}

export const communityController = new CommunityController();
