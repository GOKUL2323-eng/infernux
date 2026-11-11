import { UserSummary } from './user';

export interface MemoryCapsuleSummary {
  id: string;
  creatorId: string;
  creator: UserSummary;
  recipientIds: string[];
  title: string;
  message: string;
  mediaUrls: string[];
  unlockAt: string;
  isUnlocked: boolean;
  unlockedNotified: boolean;
  createdAt: string;
}

export type MoodType =
  | 'happy'
  | 'calm'
  | 'hyped'
  | 'focused'
  | 'melancholy'
  | 'grateful'
  | 'tired'
  | 'inspired';

export interface MoodEntrySummary {
  id: string;
  userId: string;
  user: UserSummary;
  mood: MoodType;
  emoji: string;
  note?: string;
  colorHex: string;
  isPublic: boolean;
  createdAt: string;
}

export type TogetherSessionType = 'watch' | 'listen' | 'study';

export interface TogetherSessionSummary {
  id: string;
  hostId: string;
  host: UserSummary;
  title: string;
  sessionType: TogetherSessionType;
  mediaUrl?: string;
  trackTitle?: string;
  playbackPositionSec: number;
  isPlaying: boolean;
  participantIds: string[];
  participants: UserSummary[];
  status: 'active' | 'ended';
  createdAt: string;
}

