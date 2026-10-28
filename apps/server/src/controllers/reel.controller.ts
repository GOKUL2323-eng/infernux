import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { reelService } from '../services/reel.service';
import { sendSuccess, getParam } from '../utils/response';

export class ReelController {
  async createReel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reel = await reelService.createReel(req.userId!, req.body);
      sendSuccess(res, reel, 'Reel published successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getFeed(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 15;
      const beforeCursor = req.query.beforeCursor as string | undefined;

      const result = await reelService.getReelsFeed(req.userId, limit, beforeCursor);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async likeReel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const result = await reelService.likeReel(req.userId!, id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async recordView(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await reelService.recordView(id);
      sendSuccess(res, null, 'View recorded');
    } catch (error) {
      next(error);
    }
  }

  async getUserReels(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getParam(req.params.userId);
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const reels = await reelService.getUserReels(userId, limit);
      sendSuccess(res, reels);
    } catch (error) {
      next(error);
    }
  }
}

export const reelController = new ReelController();
