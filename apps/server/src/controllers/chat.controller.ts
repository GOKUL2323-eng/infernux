import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { chatService } from '../services/chat.service';
import { chatOrganizationService } from '../services/chat-organization.service';
import { streakService } from '../services/streak.service';
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

  async consumeViewOnce(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const messageId = getParam(req.params.messageId);
      await chatService.consumeViewOnce(messageId, req.userId!);
      sendSuccess(res, null, 'View-once media consumed and purged');
    } catch (error) {
      next(error);
    }
  }

  async saveMedia(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const messageId = getParam(req.params.messageId);
      await chatService.recordMediaSaved(messageId, req.userId!, req.body.mediaUrl);
      sendSuccess(res, null, 'Media saved recorded');
    } catch (error) {
      next(error);
    }
  }

  async pinMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const message = await chatService.pinMessage(id, req.userId!, Boolean(req.body.pinned));
      sendSuccess(res, message, 'Message pin updated');
    } catch (error) {
      next(error);
    }
  }

  async forwardMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const messages = await chatService.forwardMessage(
        id,
        req.userId!,
        req.body.targetConversationIds
      );
      sendSuccess(res, messages, 'Message forwarded', 201);
    } catch (error) {
      next(error);
    }
  }

  async interactMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const message = await chatService.interactWithMessage(id, req.userId!, req.body);
      sendSuccess(res, message, 'Interactive card updated');
    } catch (error) {
      next(error);
    }
  }

  async addSecretReaction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const message = await chatService.addSecretReaction(id, req.userId!, req.body.emoji);
      sendSuccess(res, message, 'Secret reaction added');
    } catch (error) {
      next(error);
    }
  }

  async revealSecretReaction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const message = await chatService.revealSecretReaction(id, req.userId!);
      sendSuccess(res, message, 'Secret reaction revealed');
    } catch (error) {
      next(error);
    }
  }

  async getScheduledMessages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const messages = await chatService.getScheduledMessages(id, req.userId!);
      sendSuccess(res, messages);
    } catch (error) {
      next(error);
    }
  }

  async cancelScheduledMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const messageId = getParam(req.params.messageId);
      await chatService.cancelScheduledMessage(messageId, req.userId!);
      sendSuccess(res, null, 'Scheduled message cancelled');
    } catch (error) {
      next(error);
    }
  }

  async translateMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const result = await chatService.translateMessage(id, req.userId!, req.body.targetLang);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async transcribeMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const result = await chatService.transcribeVoiceMessage(id, req.userId!);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateConversationPrefs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const prefs = await chatOrganizationService.updateConversationPreferences(id, req.userId!, req.body);
      sendSuccess(res, prefs, 'Conversation preferences updated');
    } catch (error) {
      next(error);
    }
  }

  async getDraft(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const content = await chatOrganizationService.getDraft(id, req.userId!);
      sendSuccess(res, { conversationId: id, content });
    } catch (error) {
      next(error);
    }
  }

  async syncDraft(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const content = await chatOrganizationService.syncDraft(id, req.userId!, req.body.content);
      sendSuccess(res, { conversationId: id, content });
    } catch (error) {
      next(error);
    }
  }

  async savePersonalMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const saved = await chatOrganizationService.savePersonalMessage(id, req.userId!, req.body);
      sendSuccess(res, saved, 'Message saved to personal collection', 201);
    } catch (error) {
      next(error);
    }
  }

  async unsavePersonalMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await chatOrganizationService.unsavePersonalMessage(id, req.userId!);
      sendSuccess(res, null, 'Removed from saved messages');
    } catch (error) {
      next(error);
    }
  }

  async getSavedMessages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const collectionName = req.query.collectionName as string | undefined;
      const importantOnly = req.query.important === 'true';
      const items = await chatOrganizationService.getSavedMessages(
        req.userId!,
        { collectionName, importantOnly },
        (m, viewerId) => chatService.formatMessageSummary(m, viewerId)
      );
      sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  }

  async createReminder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const reminder = await chatOrganizationService.createReminder(id, req.userId!, req.body);
      sendSuccess(res, reminder, 'Reminder scheduled', 201);
    } catch (error) {
      next(error);
    }
  }

  async getReminders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reminders = await chatOrganizationService.getReminders(req.userId!);
      sendSuccess(res, reminders);
    } catch (error) {
      next(error);
    }
  }

  async dismissReminder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reminderId = getParam(req.params.reminderId);
      await chatOrganizationService.dismissReminder(reminderId, req.userId!);
      sendSuccess(res, null, 'Reminder dismissed');
    } catch (error) {
      next(error);
    }
  }

  async getFolders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const folders = await chatOrganizationService.getFolders(req.userId!);
      sendSuccess(res, folders);
    } catch (error) {
      next(error);
    }
  }

  async createFolder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const folder = await chatOrganizationService.createFolder(req.userId!, req.body);
      sendSuccess(res, folder, 'Folder created', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateFolder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const folderId = getParam(req.params.folderId);
      const folder = await chatOrganizationService.updateFolder(req.userId!, folderId, req.body);
      sendSuccess(res, folder, 'Folder updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteFolder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const folderId = getParam(req.params.folderId);
      await chatOrganizationService.deleteFolder(req.userId!, folderId);
      sendSuccess(res, null, 'Folder deleted');
    } catch (error) {
      next(error);
    }
  }

  async getStreaks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const streaks = await streakService.getUserStreaks(req.userId!);
      sendSuccess(res, streaks);
    } catch (error) {
      next(error);
    }
  }

  async recoverStreak(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const streakId = getParam(req.params.streakId);
      const streak = await streakService.recoverStreak(streakId, req.userId!);
      sendSuccess(res, streak, 'Streak recovered');
    } catch (error) {
      next(error);
    }
  }

  async updateStreakSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const streakId = getParam(req.params.streakId);
      const streak = await streakService.updateSettings(streakId, req.userId!, req.body);
      sendSuccess(res, streak, 'Streak settings updated');
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
