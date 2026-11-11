import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { experienceService } from '../services/experience.service';
import { sendSuccess, getParam } from '../utils/response';

export class ExperienceController {
  async createCapsule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await experienceService.createCapsule(req.userId!, req.body);
      sendSuccess(res, data, 'Memory capsule locked', 201);
    } catch (error) {
      next(error);
    }
  }

  async listCapsules(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await experienceService.listCapsules(req.userId!);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async logMood(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await experienceService.logMood(req.userId!, req.body);
      sendSuccess(res, data, 'Mood logged', 201);
    } catch (error) {
      next(error);
    }
  }

  async getMyMoods(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await experienceService.getMyMoods(req.userId!);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getMoodFeed(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await experienceService.getMoodFeed(req.userId!);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async createTogether(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await experienceService.createTogetherSession(req.userId!, req.body);
      sendSuccess(res, data, 'Together session started', 201);
    } catch (error) {
      next(error);
    }
  }

  async listTogether(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await experienceService.listTogetherSessions();
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async joinTogether(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await experienceService.joinTogetherSession(getParam(req.params.id), req.userId!);
      sendSuccess(res, data, 'Joined Together session');
    } catch (error) {
      next(error);
    }
  }

  async syncTogether(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await experienceService.syncTogetherState(
        getParam(req.params.id),
        req.userId!,
        req.body
      );
      sendSuccess(res, data, 'Playback synchronized');
    } catch (error) {
      next(error);
    }
  }

  async endTogether(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await experienceService.endTogetherSession(getParam(req.params.id), req.userId!);
      sendSuccess(res, data, 'Together session ended');
    } catch (error) {
      next(error);
    }
  }

  async updatePresence(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await experienceService.updateSmartPresence(req.userId!, req.body);
      sendSuccess(res, data, 'Smart presence updated');
    } catch (error) {
      next(error);
    }
  }

  async updateInteractiveProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data = await experienceService.updateInteractiveProfile(req.userId!, req.body);
      sendSuccess(res, data, 'Interactive profile updated');
    } catch (error) {
      next(error);
    }
  }

  async signGuestbook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await experienceService.signGuestbook(
        getParam(req.params.userId),
        req.userId!,
        req.body
      );
      sendSuccess(res, data, 'Guestbook signed', 201);
    } catch (error) {
      next(error);
    }
  }
}

export const experienceController = new ExperienceController();

