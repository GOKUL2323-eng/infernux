import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { storyService } from '../services/story.service';
import { sendSuccess, getParam } from '../utils/response';

export class StoryController {
  async createStory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const story = await storyService.createStory(req.userId!, req.body);
      sendSuccess(res, story, 'Story created', 201);
    } catch (error) {
      next(error);
    }
  }

  async getFeed(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const feed = await storyService.getStoriesFeed(req.userId!);
      sendSuccess(res, feed);
    } catch (error) {
      next(error);
    }
  }

  async recordView(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await storyService.recordStoryView(id, req.userId!);
      sendSuccess(res, null, 'Story view recorded');
    } catch (error) {
      next(error);
    }
  }

  async getViewers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const viewers = await storyService.getStoryViewers(id, req.userId!);
      sendSuccess(res, viewers);
    } catch (error) {
      next(error);
    }
  }

  async deleteStory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await storyService.deleteStory(id, req.userId!);
      sendSuccess(res, null, 'Story deleted');
    } catch (error) {
      next(error);
    }
  }

  async getCloseFriends(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const friends = await storyService.getCloseFriends(req.userId!);
      sendSuccess(res, friends);
    } catch (error) {
      next(error);
    }
  }

  async toggleCloseFriend(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await storyService.toggleCloseFriend(req.userId!, getParam(req.params.friendId));
      sendSuccess(res, result, 'Close friends list updated');
    } catch (error) {
      next(error);
    }
  }

  async reactStory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const story = await storyService.reactToStory(getParam(req.params.id), req.userId!, req.body.emoji);
      sendSuccess(res, story, 'Reaction recorded');
    } catch (error) {
      next(error);
    }
  }

  async interactSticker(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const story = await storyService.interactSticker(
        getParam(req.params.id),
        getParam(req.params.stickerId),
        req.userId!,
        req.body
      );
      sendSuccess(res, story, 'Sticker updated');
    } catch (error) {
      next(error);
    }
  }

  async addCollaborator(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const story = await storyService.addCollaborator(
        getParam(req.params.id),
        req.userId!,
        req.body.collaboratorId
      );
      sendSuccess(res, story, 'Collaborator added');
    } catch (error) {
      next(error);
    }
  }

  async createHighlight(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const highlight = await storyService.createHighlight(req.userId!, req.body);
      sendSuccess(res, highlight, 'Story highlight created', 201);
    } catch (error) {
      next(error);
    }
  }

  async getHighlights(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = getParam(req.params.userId) || req.userId!;
      const highlights = await storyService.getHighlights(targetUserId, req.userId);
      sendSuccess(res, highlights);
    } catch (error) {
      next(error);
    }
  }

  async deleteHighlight(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await storyService.deleteHighlight(req.userId!, getParam(req.params.highlightId));
      sendSuccess(res, null, 'Highlight deleted');
    } catch (error) {
      next(error);
    }
  }
}

export const storyController = new StoryController();
