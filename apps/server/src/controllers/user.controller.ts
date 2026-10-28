import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { userService } from '../services/user.service';
import { sendSuccess, getParam } from '../utils/response';

export class UserController {
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const username = getParam(req.params.username);
      const profile = await userService.getProfile(username, req.userId);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await userService.updateProfile(req.userId!, req.body);
      sendSuccess(res, profile, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updatePrivacy(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await userService.updatePrivacy(req.userId!, req.body);
      sendSuccess(res, profile, 'Privacy settings updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await userService.updateNotifications(req.userId!, req.body);
      sendSuccess(res, profile, 'Notification preferences updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async followUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const result = await userService.followUser(req.userId!, id);
      sendSuccess(res, result, result.status === 'accepted' ? 'Followed successfully' : 'Follow request sent');
    } catch (error) {
      next(error);
    }
  }

  async unfollowUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await userService.unfollowUser(req.userId!, id);
      sendSuccess(res, null, 'Unfollowed successfully');
    } catch (error) {
      next(error);
    }
  }

  async acceptFollowRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await userService.acceptFollowRequest(req.userId!, id);
      sendSuccess(res, null, 'Follow request accepted');
    } catch (error) {
      next(error);
    }
  }

  async rejectFollowRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await userService.rejectFollowRequest(req.userId!, id);
      sendSuccess(res, null, 'Follow request rejected');
    } catch (error) {
      next(error);
    }
  }

  async blockUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await userService.blockUser(req.userId!, id);
      sendSuccess(res, null, 'User blocked successfully');
    } catch (error) {
      next(error);
    }
  }

  async unblockUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await userService.unblockUser(req.userId!, id);
      sendSuccess(res, null, 'User unblocked successfully');
    } catch (error) {
      next(error);
    }
  }

  async searchUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = (req.query.q as string) || '';
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const users = await userService.searchUsers(query, req.userId, limit);
      sendSuccess(res, users);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
