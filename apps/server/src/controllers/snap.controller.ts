import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { snapService } from '../services/snap.service';
import { sendSuccess, getParam } from '../utils/response';

export class SnapController {
  async sendSnap(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const snap = await snapService.sendSnap(req.userId!, req.body);
      sendSuccess(res, snap, 'Snap sent', 201);
    } catch (error) {
      next(error);
    }
  }

  async getInbox(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const snaps = await snapService.getInbox(req.userId!);
      sendSuccess(res, snaps);
    } catch (error) {
      next(error);
    }
  }

  async getSent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const snaps = await snapService.getSent(req.userId!);
      sendSuccess(res, snaps);
    } catch (error) {
      next(error);
    }
  }

  async openSnap(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const snap = await snapService.openSnap(getParam(req.params.id), req.userId!);
      sendSuccess(res, snap);
    } catch (error) {
      next(error);
    }
  }

  async replaySnap(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const snap = await snapService.replaySnap(getParam(req.params.id), req.userId!);
      sendSuccess(res, snap, 'Snap replayed');
    } catch (error) {
      next(error);
    }
  }

  async reportScreenshot(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const snap = await snapService.reportScreenshot(getParam(req.params.id), req.userId!);
      sendSuccess(res, snap, 'Screenshot alert logged');
    } catch (error) {
      next(error);
    }
  }
}

export const snapController = new SnapController();

