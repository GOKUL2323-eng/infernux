import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { audioRoomService } from '../services/audio-room.service';
import { sendSuccess, getParam } from '../utils/response';

export class AudioRoomController {
  async createRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await audioRoomService.createRoom(req.userId!, req.body);
      sendSuccess(res, data, 'Audio room started', 201);
    } catch (error) {
      next(error);
    }
  }

  async listLiveRooms(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const communityId = req.query.communityId as string | undefined;
      const data = await audioRoomService.listLiveRooms(communityId);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await audioRoomService.getRoom(getParam(req.params.id));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async joinRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await audioRoomService.joinRoom(getParam(req.params.id), req.userId!);
      sendSuccess(res, data, 'Joined audio room');
    } catch (error) {
      next(error);
    }
  }

  async leaveRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await audioRoomService.leaveRoom(getParam(req.params.id), req.userId!);
      sendSuccess(res, data, 'Left audio room');
    } catch (error) {
      next(error);
    }
  }

  async toggleHandRaise(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await audioRoomService.toggleHandRaise(getParam(req.params.id), req.userId!);
      sendSuccess(res, data, 'Hand raise toggled');
    } catch (error) {
      next(error);
    }
  }

  async approveSpeaker(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await audioRoomService.approveSpeaker(
        getParam(req.params.id),
        req.userId!,
        getParam(req.params.userId)
      );
      sendSuccess(res, data, 'Speaker approved');
    } catch (error) {
      next(error);
    }
  }

  async revokeSpeaker(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await audioRoomService.revokeSpeaker(
        getParam(req.params.id),
        req.userId!,
        getParam(req.params.userId)
      );
      sendSuccess(res, data, 'Speaker moved to listeners');
    } catch (error) {
      next(error);
    }
  }

  async toggleMute(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = (req.body?.userId as string | undefined) || undefined;
      const data = await audioRoomService.toggleMute(
        getParam(req.params.id),
        req.userId!,
        targetUserId
      );
      sendSuccess(res, data, 'Mute state updated');
    } catch (error) {
      next(error);
    }
  }

  async sendReaction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await audioRoomService.sendReaction(
        getParam(req.params.id),
        req.userId!,
        req.body.emoji
      );
      sendSuccess(res, data, 'Reaction sent');
    } catch (error) {
      next(error);
    }
  }

  async endRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await audioRoomService.endRoom(getParam(req.params.id), req.userId!);
      sendSuccess(res, data, 'Audio room ended');
    } catch (error) {
      next(error);
    }
  }
}

export const audioRoomController = new AudioRoomController();

