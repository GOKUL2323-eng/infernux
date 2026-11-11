import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { securityService } from '../services/security.service';
import { sendSuccess } from '../utils/response';

export class SecurityController {
  async getOverview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await securityService.getOverview(req.userId!);
      sendSuccess(res, overview);
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const session = await securityService.revokeSession(req.userId!, String(req.params.id));
      sendSuccess(res, session, 'Session revoked successfully');
    } catch (error) {
      next(error);
    }
  }

  async revokeOtherSessions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await securityService.revokeOtherSessions(
        req.userId!,
        req.body?.currentRefreshToken
      );
      sendSuccess(res, result, 'Sessions revoked successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const securityController = new SecurityController();
