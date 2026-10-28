import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { notificationService } from '../services/notification.service';
import { sendSuccess, getParam } from '../utils/response';

export class NotificationController {
  async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const list = await notificationService.getNotifications(req.userId!, limit);
      sendSuccess(res, list);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await notificationService.markAsRead(id, req.userId!);
      sendSuccess(res, null, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markAllAsRead(req.userId!);
      sendSuccess(res, null, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }

  async registerPushToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      if (token) {
        await notificationService.registerPushToken(req.userId!, token);
      }
      sendSuccess(res, null, 'Push token registered');
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
