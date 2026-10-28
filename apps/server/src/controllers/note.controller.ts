import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { noteService } from '../services/note.service';
import { sendSuccess, getParam } from '../utils/response';

export class NoteController {
  async createPrivateNote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const note = await noteService.createPrivateNote(req.userId!, req.body);
      sendSuccess(res, note, 'Private note created', 201);
    } catch (error) {
      next(error);
    }
  }

  async getPrivateNotes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const folder = req.query.folder as string | undefined;
      const tag = req.query.tag as string | undefined;
      const notes = await noteService.getPrivateNotes(req.userId!, folder, tag);
      sendSuccess(res, notes);
    } catch (error) {
      next(error);
    }
  }

  async updatePrivateNote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const note = await noteService.updatePrivateNote(id, req.userId!, req.body);
      sendSuccess(res, note, 'Note updated');
    } catch (error) {
      next(error);
    }
  }

  async deletePrivateNote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await noteService.deletePrivateNote(id, req.userId!);
      sendSuccess(res, null, 'Note deleted');
    } catch (error) {
      next(error);
    }
  }

  async createSocialNote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const note = await noteService.createSocialNote(req.userId!, req.body);
      sendSuccess(res, note, 'Social status published', 201);
    } catch (error) {
      next(error);
    }
  }

  async getSocialNotesFeed(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const feed = await noteService.getSocialNotesFeed(req.userId!);
      sendSuccess(res, feed);
    } catch (error) {
      next(error);
    }
  }

  async likeSocialNote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await noteService.likeSocialNote(req.userId!, id);
      sendSuccess(res, null, 'Status liked');
    } catch (error) {
      next(error);
    }
  }
}

export const noteController = new NoteController();
