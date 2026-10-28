import { UserSummary } from './user';

export interface ReelAudioAttribution {
  id?: string;
  title: string;
  artist: string;
  audioUrl?: string;
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
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isFollowingCreator?: boolean;
  createdAt: string;
}
