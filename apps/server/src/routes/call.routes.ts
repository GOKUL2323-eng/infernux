import { Router } from 'express';
import { callController } from '../controllers/call.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  initiateCallSchema,
  respondCallSchema,
  endCallSchema,
} from '@infernux/shared';

const router = Router();

router.use(authenticate);

router.post('/initiate', validateBody(initiateCallSchema), (req, res, next) =>
  callController.initiateCall(req, res, next)
);
router.get('/:id/token', (req, res, next) => callController.getCallToken(req, res, next));
router.post('/:id/respond', validateBody(respondCallSchema), (req, res, next) =>
  callController.respondToCall(req, res, next)
);
router.post('/:id/accept', (req, res, next) =>
  callController.acceptCall(req, res, next)
);
router.post('/:id/reject', (req, res, next) =>
  callController.rejectCall(req, res, next)
);
router.post('/:id/end', (req, res, next) =>
  callController.endCall(req, res, next)
);
router.get('/history', (req, res, next) => callController.getCallHistory(req, res, next));

export default router;

