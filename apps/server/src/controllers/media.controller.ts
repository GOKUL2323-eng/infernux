import { Response, NextFunction } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { config } from '../config/env';
import { sendSuccess } from '../utils/response';
import { MediaAttachment } from '@infernux/shared';
import { logger } from '../utils/logger';

// Configure Cloudinary if credentials are provided
if (config.storage.cloudinary.cloudName && config.storage.cloudinary.apiKey && config.storage.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.storage.cloudinary.cloudName,
    api_key: config.storage.cloudinary.apiKey,
    api_secret: config.storage.cloudinary.apiSecret,
  });
  logger.info('Cloudinary SDK configured for media storage', 'Media');
}

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

      let fileUrl = `${config.apiUrl}/uploads/${file.filename}`;
      let thumbnailUrl: string | undefined = mediaType === 'image' ? fileUrl : undefined;

      // Upload to Cloudinary if enabled
      if (
        config.storage.provider === 'cloudinary' &&
        config.storage.cloudinary.cloudName &&
        config.storage.cloudinary.apiKey
      ) {
        try {
          const uploadRes = await cloudinary.uploader.upload(file.path, {
            resource_type: mediaType === 'video' ? 'video' : mediaType === 'audio' ? 'raw' : 'image',
            folder: 'infernux',
          });

          fileUrl = uploadRes.secure_url;
          if (mediaType === 'image') {
            thumbnailUrl = cloudinary.url(uploadRes.public_id, {
              width: 300,
              height: 300,
              crop: 'fill',
            });
          }
        } catch (cloudErr) {
          logger.warn('Cloudinary upload failed, falling back to local file URL', 'Media', cloudErr);
        }
      }

      const attachment: MediaAttachment = {
        url: fileUrl,
        type: mediaType,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        thumbnailUrl,
      };

      sendSuccess(res, attachment, 'Media uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

export const mediaController = new MediaController();
