import { Router } from 'express';
import { securityController } from '../controllers/security.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/overview', (req, res, next) => securityController.getOverview(req, res, next));

router.post('/sessions/revoke-all', (req, res, next) =>
  securityController.revokeOtherSessions(req, res, next)
);

router.post('/sessions/:id/revoke', (req, res, next) =>
  securityController.revokeSession(req, res, next)
);

export default router;
