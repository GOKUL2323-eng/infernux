import { Router } from 'express';
import { audioRoomController } from '../controllers/audio-room.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { audioRoomReactionSchema, createAudioRoomSchema } from '@infernux/shared';

const router = Router();
router.use(authenticate);

router.get('/', (req, res, next) => audioRoomController.listLiveRooms(req, res, next));
router.post('/', validateBody(createAudioRoomSchema), (req, res, next) =>
  audioRoomController.createRoom(req, res, next)
);
router.get('/:id', (req, res, next) => audioRoomController.getRoom(req, res, next));
router.post('/:id/join', (req, res, next) => audioRoomController.joinRoom(req, res, next));
router.post('/:id/leave', (req, res, next) => audioRoomController.leaveRoom(req, res, next));
router.post('/:id/hand', (req, res, next) => audioRoomController.toggleHandRaise(req, res, next));
router.post('/:id/speakers/:userId/approve', (req, res, next) =>
  audioRoomController.approveSpeaker(req, res, next)
);
router.post('/:id/speakers/:userId/revoke', (req, res, next) =>
  audioRoomController.revokeSpeaker(req, res, next)
);
router.post('/:id/mute', (req, res, next) => audioRoomController.toggleMute(req, res, next));
router.post('/:id/react', validateBody(audioRoomReactionSchema), (req, res, next) =>
  audioRoomController.sendReaction(req, res, next)
);
router.post('/:id/end', (req, res, next) => audioRoomController.endRoom(req, res, next));

export default router;

