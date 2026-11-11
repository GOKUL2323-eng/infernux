import { Router } from 'express';
import { snapController } from '../controllers/snap.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createSnapMomentSchema } from '@infernux/shared';

const router = Router();

router.use(authenticate);

router.get('/inbox', (req, res, next) => snapController.getInbox(req, res, next));
router.get('/sent', (req, res, next) => snapController.getSent(req, res, next));
router.post('/', validateBody(createSnapMomentSchema), (req, res, next) =>
  snapController.sendSnap(req, res, next)
);
router.post('/:id/open', (req, res, next) => snapController.openSnap(req, res, next));
router.post('/:id/replay', (req, res, next) => snapController.replaySnap(req, res, next));
router.post('/:id/screenshot', (req, res, next) => snapController.reportScreenshot(req, res, next));

export default router;

