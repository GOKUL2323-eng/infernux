import { UserSummary } from './user';
import { MediaAttachment } from './chat';

export interface CommentSummary {
  id: string;
  postId: string;
  authorId: string;
  author: UserSummary;
  content: string;
  replyToCommentId?: string;
  likesCount: number;
  isLiked?: boolean;
  replies?: CommentSummary[];
  createdAt: string;
}

export interface PostSummary {
  id: string;
  authorId: string;
  author: UserSummary;
  caption?: string;
  media: MediaAttachment[];
  hashtags: string[];
  mentions: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FeedType = 'chronological' | 'personalized';
