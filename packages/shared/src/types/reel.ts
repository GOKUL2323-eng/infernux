import { UserSummary } from './user';

export interface ReelAudioAttribution {
  id?: string;
  title: string;
  artist: string;
  audioUrl?: string;
}

export interface ReelClipSegment {
  videoUrl: string;
  startSec: number;
  endSec: number;
  speed?: number;
}

export interface ReelTextOverlay {
  id: string;
  text: string;
  color?: string;
  y?: number;
}

export interface ReelSummary {
  id: string;
  creatorId: string;
  creator: UserSummary;
  videoUrl: string;
  thumbnailUrl: string;
  caption?: string;
  hashtags: string[];
  audio?: ReelAudioAttribution;
  duration: number; // in seconds
  trimStartSec?: number;
  trimEndSec?: number;
  playbackSpeed?: number;
  clips?: ReelClipSegment[];
  voiceoverUrl?: string;
  musicVolume?: number;
  voiceoverVolume?: number;
  textOverlays?: ReelTextOverlay[];
  coverTimeSec?: number;
  status?: 'draft' | 'scheduled' | 'published';
  scheduledFor?: string;
  collaborators?: UserSummary[];
  collabInvites?: Array<{
    userId: string;
    username?: string;
    displayName?: string;
    status: 'pending' | 'accepted' | 'declined';
  }>;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isFollowingCreator?: boolean;
  createdAt: string;
}

export interface CreatorAnalyticsSummary {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  followersCount: number;
  engagementRate: number;
  reelsCount: number;
  postsCount: number;
  draftsCount: number;
  scheduledCount: number;
  topReels: ReelSummary[];
}
