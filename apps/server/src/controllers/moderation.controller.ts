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

  async listReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 25;
      const reports = await moderationService.listReports(req.userId!, status, page, limit);
      sendSuccess(res, reports);
    } catch (error) {
      next(error);
    }
  }

  async resolveReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await moderationService.resolveReport(
        req.userId!,
        String(req.params.id),
        req.body
      );
      sendSuccess(res, report, 'Report updated');
    } catch (error) {
      next(error);
    }
  }

  async suspendUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await moderationService.suspendUser(
        req.userId!,
        String(req.params.userId),
        req.body
      );
      sendSuccess(res, user, req.body.suspend ? 'Account suspended' : 'Account restored');
    } catch (error) {
      next(error);
    }
  }

  async updateUserRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await moderationService.updateUserRole(
        req.userId!,
        String(req.params.userId),
        req.body
      );
      sendSuccess(res, user, 'Account role updated');
    } catch (error) {
      next(error);
    }
  }

  async listModerationLogs(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 40;
      const logs = await moderationService.listModerationLogs(req.userId!, page, limit);
      sendSuccess(res, logs);
    } catch (error) {
      next(error);
    }
  }

  async submitAppeal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const appeal = await moderationService.submitAppeal(req.userId!, req.body);
      sendSuccess(res, appeal, 'Suspension appeal submitted', 201);
    } catch (error) {
      next(error);
    }
  }

  async listAppeals(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const appeals = await moderationService.listAppeals(req.userId!);
      sendSuccess(res, appeals);
    } catch (error) {
      next(error);
    }
  }

  async reviewAppeal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const appeal = await moderationService.reviewAppeal(
        req.userId!,
        String(req.params.id),
        req.body
      );
      sendSuccess(res, appeal, 'Appeal reviewed');
    } catch (error) {
      next(error);
    }
  }
}

export const moderationController = new ModerationController();
