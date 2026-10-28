import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { authLimiter } from '../middlewares/rateLimiter.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '@infernux/shared';

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), (req, res, next) =>
  authController.register(req, res, next)
);
router.post('/login', authLimiter, validateBody(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);
router.post('/refresh-token', validateBody(refreshTokenSchema), (req, res, next) =>
  authController.refreshToken(req, res, next)
);
router.post('/logout', (req, res, next) => authController.logout(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));
router.delete('/account', authenticate, (req, res, next) => authController.deleteAccount(req, res, next));

export default router;
