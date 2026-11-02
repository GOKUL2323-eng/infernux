import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/env';
import { logger } from './logger';
import { MediaAttachment } from '@infernux/shared';

// Initialize Cloudinary if credentials are provided
if (config.storage.cloudinary.cloudName && config.storage.cloudinary.apiKey && config.storage.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.storage.cloudinary.cloudName,
    api_key: config.storage.cloudinary.apiKey,
    api_secret: config.storage.cloudinary.apiSecret,
  });
}

/**
 * Extracts Cloudinary public_id from a secure URL
 * E.g., https://res.cloudinary.com/demo/image/upload/v12345/infernux/sample.jpg -> infernux/sample
 */
function extractCloudinaryPublicId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('cloudinary.com')) return null;

    const parts = parsed.pathname.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;

    // Skip version tag (e.g. v1234567) if present
    let publicIdParts = parts.slice(uploadIndex + 1);
    if (publicIdParts[0] && /^v\d+$/.test(publicIdParts[0])) {
      publicIdParts = publicIdParts.slice(1);
    }

    const fullPath = publicIdParts.join('/');
    const dotIndex = fullPath.lastIndexOf('.');
    return dotIndex !== -1 ? fullPath.substring(0, dotIndex) : fullPath;
  } catch {
    return null;
  }
}

/**
 * Permanently deletes a single media attachment file from local storage and/or Cloudinary.
 */
export async function deleteSingleMediaFile(url: string, type: 'image' | 'video' | 'audio' | 'document' = 'image'): Promise<boolean> {
  if (!url) return true;

  let localDeleted = false;
  let cloudDeleted = false;

  // 1. Check if it is a local upload
  try {
    const filename = path.basename(new URL(url, 'http://localhost').pathname);
    const localPath = path.join(config.storage.localUploadDir, filename);

    if (fs.existsSync(localPath)) {
      await fs.promises.unlink(localPath);
      localDeleted = true;
      logger.info(`Permanently deleted local media file: ${filename}`, 'MediaDeletion');
    }
  } catch (err) {
    logger.warn(`Error during local media file deletion for URL: ${url}`, 'MediaDeletion', err);
  }

  // 2. Check if it is hosted on Cloudinary
  try {
    const publicId = extractCloudinaryPublicId(url);
    if (publicId && config.storage.cloudinary.apiKey) {
      const resourceType = type === 'video' ? 'video' : type === 'audio' ? 'raw' : 'image';
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      cloudDeleted = true;
      logger.info(`Permanently destroyed Cloudinary asset: ${publicId} (${resourceType})`, 'MediaDeletion');
    }
  } catch (err) {
    logger.warn(`Error during Cloudinary asset destruction for URL: ${url}`, 'MediaDeletion', err);
  }

  return localDeleted || cloudDeleted;
}

/**
 * Permanently deletes a list of media attachments from all storage providers.
 */
export async function deleteMediaAttachments(attachments: MediaAttachment[]): Promise<number> {
  if (!attachments || attachments.length === 0) return 0;

  let deletedCount = 0;
  for (const att of attachments) {
    try {
      if (att.url) {
        await deleteSingleMediaFile(att.url, att.type);
        deletedCount++;
      }
      if (att.thumbnailUrl && att.thumbnailUrl !== att.url) {
        await deleteSingleMediaFile(att.thumbnailUrl, 'image');
      }
    } catch (err) {
      logger.error('Failed to delete media attachment', 'MediaDeletion', err);
    }
  }

  return deletedCount;
}

