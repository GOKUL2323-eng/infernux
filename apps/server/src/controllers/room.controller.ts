import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { roomService } from '../services/room.service';
import { sendSuccess, getParam } from '../utils/response';

export class RoomController {
  async createRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await roomService.createRoom(req.userId!, req.body);
      sendSuccess(res, result, 'Room created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async joinRoomByKey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await roomService.joinRoomByKey(req.userId!, req.body.secretKey);
      sendSuccess(res, result, 'Successfully joined room');
    } catch (error) {
      next(error);
    }
  }

  async rotateRoomKey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const keyInfo = await roomService.rotateRoomKey(id, req.userId!, req.body);
      sendSuccess(res, keyInfo, 'Room key rotated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRoomDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const room = await roomService.getRoomDetails(id, req.userId!);
      sendSuccess(res, room);
    } catch (error) {
      next(error);
    }
  }

  async getRoomMembers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const members = await roomService.getRoomMembers(id, req.userId!);
      sendSuccess(res, members);
    } catch (error) {
      next(error);
    }
  }

  async updateMemberRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const targetUserId = getParam(req.params.userId);
      await roomService.updateMemberRole(id, req.userId!, targetUserId, req.body.role);
      sendSuccess(res, null, 'Member role updated');
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const targetUserId = getParam(req.params.userId);
      await roomService.removeMember(id, req.userId!, targetUserId);
      sendSuccess(res, null, 'Member removed from room');
    } catch (error) {
      next(error);
    }
  }

  async leaveRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await roomService.leaveRoom(id, req.userId!);
      sendSuccess(res, null, 'Left room successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteRoom(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      await roomService.deleteRoom(id, req.userId!);
      sendSuccess(res, null, 'Room deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const roomController = new RoomController();
