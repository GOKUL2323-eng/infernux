import { UserSummary } from './user';
import { MusicTrack } from './music';

export interface PrivateNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  folder?: string;
  isPinned: boolean;
  isArchived: boolean;
  reminderAt?: string;
  attachments?: string[]; // URLs to images/documents
  createdAt: string;
  updatedAt: string;
}

export type SocialNoteAudience = 'followers' | 'close_friends';

export interface SocialNote {
  id: string;
  authorId: string;
  author: UserSummary;
  text: string;
  emoji?: string;
  musicTrack?: MusicTrack;
  audience: SocialNoteAudience;
  likesCount: number;
  isLiked?: boolean;
  expiresAt: string; // 24h expiration
  createdAt: string;
}
