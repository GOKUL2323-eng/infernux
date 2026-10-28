import { Router } from 'express';
import { mediaController } from '../controllers/media.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadMiddleware } from '../config/storage';

const router = Router();

router.use(authenticate);

router.post('/upload', uploadMiddleware.single('file'), (req, res, next) =>
  mediaController.uploadFile(req, res, next)
);

export default router;

