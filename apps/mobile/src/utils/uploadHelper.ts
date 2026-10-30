import { Platform } from 'react-native';
import { api } from '../api/client';
import { MediaAttachment } from '@infernux/shared';

export interface UploadAssetInput {
  uri: string;
  type?: 'image' | 'video' | 'audio' | string;
  mimeType?: string;
  fileName?: string | null;
}

/**
 * Uploads a local file asset (from ImagePicker or Audio recording) to the MOZHI media server
 * and returns the persistent HTTP / Cloudinary URL.
 */
export async function uploadMediaAsset(asset: UploadAssetInput): Promise<string> {
  if (!asset.uri) return '';
  // If already a remote URL (http/https), return as is
  if (asset.uri.startsWith('http://') || asset.uri.startsWith('https://')) {
    return asset.uri;
  }

  try {
    const formData = new FormData();
    const isVideo =
      asset.type === 'video' ||
      asset.uri.endsWith('.mp4') ||
      asset.uri.endsWith('.mov') ||
      (asset.mimeType && asset.mimeType.startsWith('video/'));

    const isAudio =
      asset.type === 'audio' ||
      asset.uri.endsWith('.m4a') ||
      asset.uri.endsWith('.caf') ||
      asset.uri.endsWith('.mp3') ||
      (asset.mimeType && asset.mimeType.startsWith('audio/'));

    const defaultName = isVideo ? 'video.mp4' : isAudio ? 'audio.m4a' : 'image.jpg';
    const defaultMime = isVideo ? 'video/mp4' : isAudio ? 'audio/m4a' : 'image/jpeg';
    const fileName = asset.fileName || defaultName;
    const mimeType = asset.mimeType || defaultMime;

    if (Platform.OS === 'web') {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      formData.append('file', blob, fileName);
    } else {
      formData.append('file', {
        uri: Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', ''),
        name: fileName,
        type: mimeType,
      } as any);
    }

    const res = await api.upload<MediaAttachment>('/media/upload', formData);
    if (res.success && res.data?.url) {
      return res.data.url;
    }

    console.warn('Media upload did not return URL, falling back to local URI:', res.error);
    return asset.uri;
  } catch (err) {
    console.warn('Failed to upload media asset, falling back:', err);
    return asset.uri;
  }
}
