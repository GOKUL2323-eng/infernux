import { UserSummary } from './user';

export type StoryMediaType = 'image' | 'video';

export type StoryAudience = 'all' | 'followers' | 'close_friends' | 'custom';

export interface StoryQuestionResponse {
  id: string;
  userId?: string;
  username?: string;
  text: string;
  isAnonymous: boolean;
  createdAt: string;
}

export interface StorySticker {
  id: string;
  kind: 'question_box' | 'poll' | 'music' | 'countdown';
  prompt?: string;
  allowAnonymous?: boolean;
  responses?: StoryQuestionResponse[];
  question?: string;
  options?: Array<{ id: string; text: string; voterIds: string[] }>;
  musicTitle?: string;
  musicArtist?: string;
  audioUrl?: string;
  countdownTitle?: string;
  countdownTargetDate?: string;
}

export interface StoryReactionSummary {
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface StoryItem {
  id: string;
  creatorId: string;
  creator: UserSummary;
  mediaType: StoryMediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  audience: StoryAudience;
  allowedUserIds?: string[];
  collaboratorIds?: string[];
  collaborators?: UserSummary[];
  stickers?: StorySticker[];
  reactions?: StoryReactionSummary[];
  duration: number; // Duration in seconds (e.g. 5s for image, video length for video)
  viewsCount: number;
  hasViewed: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface StoryHighlightSummary {
  id: string;
  ownerId: string;
  title: string;
  coverUrl?: string;
  storyIds: string[];
  stories?: StoryItem[];
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
