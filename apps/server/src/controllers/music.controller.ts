import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { musicService } from '../services/music.service';
import { sendSuccess, getParam } from '../utils/response';

export class MusicController {
  async getCatalog(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 30;
      const catalog = await musicService.getCatalog(limit);
      sendSuccess(res, catalog);
    } catch (error) {
      next(error);
    }
  }

  async search(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = (req.query.q as string) || '';
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const tracks = await musicService.searchTracks(query, limit);
      sendSuccess(res, tracks);
    } catch (error) {
      next(error);
    }
  }

  async getTrackById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const track = await musicService.getTrackById(id);
      sendSuccess(res, track);
    } catch (error) {
      next(error);
    }
  }

  async createPlaylist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const playlist = await musicService.createPlaylist(req.userId!, req.body);
      sendSuccess(res, playlist, 'Playlist created', 201);
    } catch (error) {
      next(error);
    }
  }

  async getPlaylists(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const playlists = await musicService.getPlaylists(req.userId!);
      sendSuccess(res, playlists);
    } catch (error) {
      next(error);
    }
  }

  async addTrackToPlaylist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await musicService.addTrackToPlaylist(id, req.userId!, req.body.trackId);
      sendSuccess(res, null, 'Track added to playlist');
    } catch (error) {
      next(error);
    }
  }
}

export const musicController = new MusicController();
