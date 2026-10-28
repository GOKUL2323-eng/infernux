import { UserSummary } from './user';

export type StoryMediaType = 'image' | 'video';

export type StoryAudience = 'all' | 'followers' | 'close_friends';

export interface StoryItem {
  id: string;
  creatorId: string;
  creator: UserSummary;
  mediaType: StoryMediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  audience: StoryAudience;
  duration: number; // Duration in seconds (e.g. 5s for image, video length for video)
  viewsCount: number;
  hasViewed: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface UserStoriesGroup {
  user: UserSummary;
  hasUnseenStories: boolean;
  stories: StoryItem[];
  latestStoryCreatedAt: string;
}

export interface StoryViewRecord {
  storyId: string;
  viewerId: string;
  viewer: UserSummary;
  viewedAt: string;
}
