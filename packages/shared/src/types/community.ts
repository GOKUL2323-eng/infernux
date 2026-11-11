import { MediaAttachment, UserSummary } from './index';

export type CommunityRole = 'owner' | 'moderator' | 'member';
export type CommunityChannelType = 'announcement' | 'discussion' | 'thread' | 'resources';

export interface CommunitySummary {
  id: string;
  name: string;
  description: string;
  category: string;
  iconUrl?: string;
  bannerUrl?: string;
  isPrivate: boolean;
  ownerId: string;
  membersCount: number;
  channelsCount: number;
  myRole?: CommunityRole;
  isMember: boolean;
  createdAt: string;
}

export interface CommunityChannelSummary {
  id: string;
  communityId: string;
  name: string;
  description?: string;
  type: CommunityChannelType;
  isAnnouncementOnly: boolean;
  postsCount: number;
  createdAt: string;
}

export interface CommunityPostSummary {
  id: string;
  communityId: string;
  channelId: string;
  authorId: string;
  author: UserSummary;
  title?: string;
  content: string;
  attachments: MediaAttachment[];
  pinned: boolean;
  parentPostId?: string;
  repliesCount: number;
  createdAt: string;
}

export interface AudioRoomParticipant {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'host' | 'speaker' | 'listener';
  isMuted: boolean;
  handRaised: boolean;
  lastReaction?: string;
  joinedAt: string;
}

export interface AudioRoomSummary {
  id: string;
  title: string;
  topic?: string;
  communityId?: string;
  hostId: string;
  host: UserSummary;
  status: 'live' | 'ended';
  participants: AudioRoomParticipant[];
  speakerRequests: string[];
  createdAt: string;
  endedAt?: string;
}

export type SharedFileCategory = 'image' | 'video' | 'audio' | 'document' | 'archive';
export type SharedFileScope = 'personal' | 'community' | 'chat';

export interface SharedFileSummary {
  id: string;
  ownerId: string;
  owner?: UserSummary;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileUrl: string;
  previewUrl?: string;
  category: SharedFileCategory;
  scope: SharedFileScope;
  scopeId?: string;
  shareToken: string;
  expiresAt?: string;
  isExpired: boolean;
  downloadsCount: number;
  createdAt: string;
}

export interface StorageQuotaSummary {
  usedBytes: number;
  quotaBytes: number;
  filesCount: number;
  percentUsed: number;
}

