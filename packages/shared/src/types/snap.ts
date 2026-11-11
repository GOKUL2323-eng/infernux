import { UserSummary } from './user';

export type SnapFilterPreset = 'normal' | 'neon' | 'noir' | 'vivid' | 'vaporwave' | 'warm';

export interface SnapOverlayItem {
  id: string;
  type: 'text' | 'sticker';
  content: string;
  x: number;
  y: number;
  color?: string;
  scale?: number;
}

export interface SnapMomentSummary {
  id: string;
  senderId: string;
  sender: UserSummary;
  recipientIds: string[];
  mediaType: 'image' | 'video';
  mediaUrl: string;
  caption?: string;
  filter: SnapFilterPreset;
  overlays: SnapOverlayItem[];
  disappearingSeconds: number;
  allowReplay: boolean;
  replayedByIds: string[];
  viewedByIds: string[];
  screenshotAlerts: Array<{
    userId: string;
    username?: string;
    detectedAt: string;
  }>;
  hasViewedByMe: boolean;
  hasReplayedByMe: boolean;
  isExpired: boolean;
  expiresAt: string;
  createdAt: string;
}

