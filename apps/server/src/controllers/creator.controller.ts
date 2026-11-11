import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { creatorService } from '../services/creator.service';
import { sendSuccess, getParam } from '../utils/response';

export class CreatorController {
  async getAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const analytics = await creatorService.getAnalytics(req.userId!);
      sendSuccess(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  async getStudioQueue(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const queue = await creatorService.getStudioQueue(req.userId!);
      sendSuccess(res, queue);
    } catch (error) {
      next(error);
    }
  }

  async publishDraft(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reel = await creatorService.publishDraftReel(req.userId!, getParam(req.params.id));
      sendSuccess(res, reel, 'Draft published');
    } catch (error) {
      next(error);
    }
  }
}

export const creatorController = new CreatorController();

