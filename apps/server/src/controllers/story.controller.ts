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
}

export const storyController = new StoryController();
