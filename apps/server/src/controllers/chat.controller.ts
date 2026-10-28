import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { chatService } from '../services/chat.service';
import { sendSuccess, getParam } from '../utils/response';

export class ChatController {
  async getConversations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const conversations = await chatService.getConversations(req.userId!);
      sendSuccess(res, conversations);
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const limit = parseInt(req.query.limit as string, 10) || 30;
      const beforeCursor = req.query.beforeCursor as string | undefined;

      const result = await chatService.getMessages(id, req.userId!, limit, beforeCursor);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const message = await chatService.sendMessage(req.userId!, {
        ...req.body,
        conversationId: id,
      });
      sendSuccess(res, message, 'Message sent', 201);
    } catch (error) {
      next(error);
    }
  }

  async editMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const message = await chatService.editMessage(id, req.userId!, req.body);
      sendSuccess(res, message, 'Message edited');
    } catch (error) {
      next(error);
    }
  }

  async deleteMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await chatService.deleteMessage(id, req.userId!);
      sendSuccess(res, null, 'Message deleted');
    } catch (error) {
      next(error);
    }
  }

  async addReaction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await chatService.addReaction(id, req.userId!, req.body);
      sendSuccess(res, null, 'Reaction added');
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await chatService.markAsRead(id, req.userId!);
      sendSuccess(res, null, 'Conversation marked as read');
    } catch (error) {
      next(error);
    }
  }

  async createConversation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const conversationId = await chatService.createConversation(req.userId!, req.body);
      sendSuccess(res, { conversationId }, 'Conversation created', 201);
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
