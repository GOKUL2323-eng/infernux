import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { config } from '../config/env';
import { sendSuccess } from '../utils/response';
import { MediaAttachment } from '@infernux/shared';

export class MediaController {
  async uploadFile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new Error('No file provided for upload');
      }

      const file = req.file;
      let mediaType: 'image' | 'video' | 'audio' | 'document' = 'document';

      if (file.mimetype.startsWith('image/')) {
        mediaType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        mediaType = 'video';
      } else if (file.mimetype.startsWith('audio/')) {
        mediaType = 'audio';
      }

      const fileUrl = `${config.apiUrl}/uploads/${file.filename}`;

      const attachment: MediaAttachment = {
        url: fileUrl,
        type: mediaType,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        thumbnailUrl: mediaType === 'image' ? fileUrl : undefined,
      };

      sendSuccess(res, attachment, 'Media uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

export const mediaController = new MediaController();
