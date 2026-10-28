import { UserSummary } from './user';

export type ConversationType = 'direct' | 'group' | 'room';

export type RoomRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface RoomMember {
  userId: string;
  user: UserSummary;
  role: RoomRole;
  joinedAt: string;
  isMuted?: boolean;
}

export interface RoomKeyInfo {
  keyId: string;
  secretKey: string; // The cryptographic invitation token (e.g., IFNX-XXXX-XXXX-XXXX)
  inviteUrl: string;
  qrPayload: string;
  expiresAt: string | null;
  maxUses: number | null;
  usesCount: number;
  isActive: boolean;
  requiresApproval: boolean;
  createdAt: string;
}

export interface RoomDetails {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  ownerId: string;
  isPrivate: boolean;
  memberCount: number;
  members?: RoomMember[];
  currentKey?: RoomKeyInfo;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  id: string;
  type: ConversationType;
  title: string;
  avatarUrl?: string;
  participants: UserSummary[];
  lastMessage?: MessageSummary;
  unreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
  updatedAt: string;
  roomId?: string;
}

export type MessageContentType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'shared_post'
  | 'shared_reel'
  | 'music_reference'
  | 'call_event';

export interface MessageReaction {
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface MessageReceipt {
  userId: string;
  status: 'sent' | 'delivered' | 'read';
  updatedAt: string;
}

export interface MediaAttachment {
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  fileName?: string;
  fileSize?: number;
  duration?: number; // for audio/video in seconds
  width?: number;
  height?: number;
  mimeType?: string;
}

export interface MessageSummary {
  id: string;
  conversationId: string;
  senderId: string;
  sender: UserSummary;
  contentType: MessageContentType;
  content: string;
  attachments?: MediaAttachment[];
  replyTo?: {
    id: string;
    senderDisplayName: string;
    content: string;
    contentType: MessageContentType;
  };
  reactions: MessageReaction[];
  receipts: MessageReceipt[];
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface TypingStatus {
  conversationId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}
