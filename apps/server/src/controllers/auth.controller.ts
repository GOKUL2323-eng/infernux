import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';

export class AuthController {
  async register(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body, req.ip, req.headers['user-agent']);
      sendSuccess(res, result, 'User registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body, req.ip, req.headers['user-agent']);
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tokens = await authService.refreshTokens(req.body.refreshToken);
      sendSuccess(res, tokens, 'Tokens refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.body.refreshToken) {
        await authService.logout(req.body.refreshToken);
      }
      sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      sendSuccess(res, req.user.toProfileJSON());
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.deleteAccount(req.userId!);
      sendSuccess(res, null, 'Account deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.changePassword(req.userId!, req.body);
      sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  async sendPhoneOtp(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.sendPhoneOtp(req.body);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  async loginWithPhone(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.loginWithPhone(req.body, req.ip, req.headers['user-agent']);
      sendSuccess(res, result, 'Phone login successful');
    } catch (error) {
      next(error);
    }
  }

  async registerWithPhone(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.registerWithPhone(req.body, req.ip, req.headers['user-agent']);
      sendSuccess(res, result, 'Phone registration successful', 201);
    } catch (error) {
      next(error);
    }
  }

  async changePhoneNumber(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.changePhoneNumber(req.userId!, req.body);
      sendSuccess(res, result, 'Phone number updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

