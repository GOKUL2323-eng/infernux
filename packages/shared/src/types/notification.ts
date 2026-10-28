import { UserSummary } from './user';

export type NotificationType =
  | 'message'
  | 'room_invitation'
  | 'call_incoming'
  | 'call_missed'
  | 'follow'
  | 'follow_request'
  | 'post_like'
  | 'post_comment'
  | 'reel_like'
  | 'reel_comment'
  | 'story_reply'
  | 'social_note_like'
  | 'mention';

export interface AppNotification {
  id: string;
  recipientId: string;
  actorId: string;
  actor: UserSummary;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    conversationId?: string;
    roomId?: string;
    callId?: string;
    postId?: string;
    reelId?: string;
    storyId?: string;
    noteId?: string;
    [key: string]: any;
  };
  isRead: boolean;
  createdAt: string;
}
