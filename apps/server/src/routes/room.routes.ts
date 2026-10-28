import { Router } from 'express';
import { roomController } from '../controllers/room.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  createRoomSchema,
  joinRoomByKeySchema,
  rotateRoomKeySchema,
  updateMemberRoleSchema,
} from '@infernux/shared';

const router = Router();

router.use(authenticate);

router.post('/', validateBody(createRoomSchema), (req, res, next) =>
  roomController.createRoom(req, res, next)
);
router.post('/join', validateBody(joinRoomByKeySchema), (req, res, next) =>
  roomController.joinRoomByKey(req, res, next)
);
router.post('/:id/rotate-key', validateBody(rotateRoomKeySchema), (req, res, next) =>
  roomController.rotateRoomKey(req, res, next)
);
router.get('/:id', (req, res, next) => roomController.getRoomDetails(req, res, next));
router.get('/:id/members', (req, res, next) => roomController.getRoomMembers(req, res, next));
router.patch('/:id/members/:userId', validateBody(updateMemberRoleSchema), (req, res, next) =>
  roomController.updateMemberRole(req, res, next)
);
router.delete('/:id/members/:userId', (req, res, next) =>
  roomController.removeMember(req, res, next)
);
router.post('/:id/leave', (req, res, next) => roomController.leaveRoom(req, res, next));
router.delete('/:id', (req, res, next) => roomController.deleteRoom(req, res, next));

export default router;
