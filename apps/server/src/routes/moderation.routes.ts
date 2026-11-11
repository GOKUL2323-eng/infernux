import { Router } from 'express';
import {
  createAppealSchema,
  createReportSchema,
  resolveReportSchema,
  reviewAppealSchema,
  suspendUserSchema,
  updateAccountRoleSchema,
} from '@infernux/shared';
import { moderationController } from '../controllers/moderation.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';

const router = Router();

router.use(authenticate);

router.get('/reports', (req, res, next) => moderationController.listReports(req, res, next));

router.post('/reports', validateBody(createReportSchema), (req, res, next) =>
  moderationController.submitReport(req, res, next)
);

router.post('/reports/:id/resolve', validateBody(resolveReportSchema), (req, res, next) =>
  moderationController.resolveReport(req, res, next)
);

router.post('/users/:userId/suspend', validateBody(suspendUserSchema), (req, res, next) =>
  moderationController.suspendUser(req, res, next)
);

router.post('/users/:userId/role', validateBody(updateAccountRoleSchema), (req, res, next) =>
  moderationController.updateUserRole(req, res, next)
);

router.get('/logs', (req, res, next) => moderationController.listModerationLogs(req, res, next));

router.get('/appeals', (req, res, next) => moderationController.listAppeals(req, res, next));

router.post('/appeals', validateBody(createAppealSchema), (req, res, next) =>
  moderationController.submitAppeal(req, res, next)
);

router.post('/appeals/:id/review', validateBody(reviewAppealSchema), (req, res, next) =>
  moderationController.reviewAppeal(req, res, next)
);

export default router;
