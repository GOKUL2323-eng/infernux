import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from './env';
import { APP_LIMITS } from '@infernux/shared';

// Ensure upload directory exists
if (!fs.existsSync(config.storage.localUploadDir)) {
  fs.mkdirSync(config.storage.localUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.storage.localUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimePrefixes = ['image/', 'video/', 'audio/', 'application/pdf'];
  const isAllowed = allowedMimePrefixes.some((prefix) => file.mimetype.startsWith(prefix));

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: APP_LIMITS.MAX_VIDEO_SIZE_BYTES, // max 50MB
  },
});
