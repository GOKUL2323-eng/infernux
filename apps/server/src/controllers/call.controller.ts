import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { callService } from '../services/call.service';
import { sendSuccess, getParam } from '../utils/response';

export class CallController {
  async initiateCall(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await callService.initiateCall(req.userId!, req.body);
      sendSuccess(res, session, 'Call initiated', 201);
    } catch (error) {
      next(error);
    }
  }

  async getCallToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const result = await callService.getCallToken(id, req.userId!);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async respondToCall(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const session = await callService.respondToCall(id, req.userId!, req.body);
      sendSuccess(res, session);
    } catch (error) {
      next(error);
    }
  }

  async endCall(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await callService.endCall(id, req.userId!, req.body);
      sendSuccess(res, null, 'Call ended');
    } catch (error) {
      next(error);
    }
  }

  async getCallHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 30;
      const history = await callService.getCallHistory(req.userId!, limit);
      sendSuccess(res, history);
    } catch (error) {
      next(error);
    }
  }
}

export const callController = new CallController();
