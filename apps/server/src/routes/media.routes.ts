import { Router } from 'express';
import { mediaController } from '../controllers/media.controller';
import { sharedFileController } from '../controllers/shared-file.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { registerSharedFileSchema } from '@infernux/shared';
import { uploadMiddleware } from '../config/storage';

const router = Router();

router.use(authenticate);

router.post('/upload', uploadMiddleware.single('file'), (req, res, next) =>
  mediaController.uploadFile(req, res, next)
);

router.get('/files/quota', (req, res, next) => sharedFileController.getQuota(req, res, next));
router.get('/files', (req, res, next) => sharedFileController.listFiles(req, res, next));
router.post('/files', validateBody(registerSharedFileSchema), (req, res, next) =>
  sharedFileController.registerFile(req, res, next)
);
router.get('/files/share/:token', (req, res, next) =>
  sharedFileController.accessByToken(req, res, next)
);
router.delete('/files/:id', (req, res, next) =>
  sharedFileController.deleteFile(req, res, next)
);

export default router;

