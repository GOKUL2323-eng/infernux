import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { aiAssistantService } from '../services/ai-assistant.service';
import { sendSuccess } from '../utils/response';

export class AiController {
  async summarizeConversation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await aiAssistantService.summarizeConversation(req.userId!, req.body);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async suggestReplies(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await aiAssistantService.suggestReplies(req.userId!, req.body);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async generateContentAssist(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await aiAssistantService.generateContentAssist(req.body);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AiController();
