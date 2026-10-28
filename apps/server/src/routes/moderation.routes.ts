import { Router } from 'express';
import { moderationController } from '../controllers/moderation.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createReportSchema } from '@infernux/shared';

const router = Router();

router.use(authenticate);

router.post('/reports', validateBody(createReportSchema), (req, res, next) =>
  moderationController.submitReport(req, res, next)
);

export default router;

