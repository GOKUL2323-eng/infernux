import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { moderationService } from '../services/moderation.service';
import { sendSuccess } from '../utils/response';

export class ModerationController {
  async submitReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await moderationService.submitReport(req.userId!, req.body);
      sendSuccess(res, report, 'Report submitted for review', 201);
    } catch (error) {
      next(error);
    }
  }
}

export const moderationController = new ModerationController();

