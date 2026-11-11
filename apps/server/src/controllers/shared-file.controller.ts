import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { fileSharingService } from '../services/file-sharing.service';
import { sendSuccess, getParam } from '../utils/response';
import { SharedFileScope } from '@infernux/shared';

export class SharedFileController {
  async getQuota(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const quota = await fileSharingService.getQuota(req.userId!);
      sendSuccess(res, quota);
    } catch (error) {
      next(error);
    }
  }

  async registerFile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await fileSharingService.registerFile(req.userId!, req.body);
      sendSuccess(res, record, 'File registered in library', 201);
    } catch (error) {
      next(error);
    }
  }

  async listFiles(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const scope = req.query.scope as SharedFileScope | undefined;
      const scopeId = req.query.scopeId as string | undefined;
      const files = await fileSharingService.listFiles(req.userId!, scope, scopeId);
      sendSuccess(res, files);
    } catch (error) {
      next(error);
    }
  }

  async accessByToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = await fileSharingService.accessByShareToken(getParam(req.params.token));
      sendSuccess(res, file);
    } catch (error) {
      next(error);
    }
  }

  async deleteFile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await fileSharingService.deleteFile(req.userId!, getParam(req.params.id));
      sendSuccess(res, result, 'File removed from library');
    } catch (error) {
      next(error);
    }
  }
}

export const sharedFileController = new SharedFileController();

