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

export type DisappearingMode = 'off' | 'after_view' | '24h' | '7d';

export type MediaSavePolicy = 'view_only' | 'allow_save' | 'view_once' | 'keep_in_chat';

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
  disappearingMode?: DisappearingMode;
  mediaSavePolicy?: MediaSavePolicy;
  isDeleting?: boolean;
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
  isPriority?: boolean;
  isArchived?: boolean;
  folderIds?: string[];
  draftContent?: string;
  streak?: FriendStreakSummary;
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
  | 'call_event'
  | 'poll'
  | 'quiz'
  | 'voting_card'
  | 'event'
  | 'checklist'
  | 'location'
  | 'contact'
  | 'task';

export type InteractiveCardKind =
  | 'poll'
  | 'quiz'
  | 'voting_card'
  | 'event'
  | 'checklist'
  | 'location'
  | 'contact'
  | 'task';

export interface InteractivePollOption {
  id: string;
  text: string;
  voterIds: string[];
  isCorrect?: boolean;
}

export interface InteractiveChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedBy?: string;
  assigneeId?: string;
}

export interface InteractiveEventData {
  title: string;
  description?: string;
  startsAt: string;
  location?: string;
  rsvpGoingIds: string[];
  rsvpMaybeIds: string[];
  rsvpDeclinedIds: string[];
}

export interface InteractiveLocationData {
  label: string;
  latitude: number;
  longitude: number;
  address?: string;
  liveUntil?: string;
}

export interface InteractiveContactData {
  userId?: string;
  displayName: string;
  username?: string;
  phone?: string;
}

export interface InteractiveTaskData {
  title: string;
  assigneeId: string;
  assigneeDisplayName?: string;
  dueAt?: string;
  status: 'todo' | 'in_progress' | 'done';
}

export interface InteractiveMessageData {
  kind: InteractiveCardKind;
  question?: string;
  allowMultiple?: boolean;
  explanation?: string;
  options?: InteractivePollOption[];
  checklistItems?: InteractiveChecklistItem[];
  event?: InteractiveEventData;
  location?: InteractiveLocationData;
  contact?: InteractiveContactData;
  task?: InteractiveTaskData;
}

export interface SecretReactionSummary {
  userId: string;
  emoji: string;
  isRevealed: boolean;
  createdAt: string;
}

export interface ChatFolderSummary {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  conversationIds: string[];
  order: number;
  createdAt: string;
}

export interface MessageReminderSummary {
  id: string;
  userId: string;
  messageId: string;
  conversationId: string;
  remindAt: string;
  note?: string;
  status: 'pending' | 'triggered' | 'dismissed';
  messagePreview?: string;
  createdAt: string;
}

export interface SavedMessageCollectionItem {
  id: string;
  messageId: string;
  conversationId: string;
  collectionName: string;
  note?: string;
  isImportant: boolean;
  message?: MessageSummary;
  createdAt: string;
}

export interface FriendStreakSummary {
  id: string;
  partnerId: string;
  currentStreak: number;
  longestStreak: number;
  lastInteractionDate?: string;
  status: 'active' | 'at_risk' | 'broken';
  remindersEnabled: boolean;
  privacyHidden: boolean;
  recoveriesUsedThisMonth: number;
  maxRecoveriesPerMonth: number;
  lastRecoveredAt?: string;
}

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
  pinnedAt?: string;
  pinnedBy?: string;
  isScheduled?: boolean;
  scheduledFor?: string;
  scheduleStatus?: 'pending' | 'delivered' | 'cancelled';
  forwardedFrom?: {
    messageId: string;
    senderDisplayName: string;
    conversationId?: string;
  };
  secretReactions?: SecretReactionSummary[];
  interactiveData?: InteractiveMessageData;
  translations?: Record<string, string>;
  voiceTranscript?: {
    text: string;
    status: 'available' | 'unconfigured';
    note?: string;
  };
  isSavedByMe?: boolean;
  isImportant?: boolean;
  expiresAt?: string;
  disappearingMode?: DisappearingMode;
  viewOnce?: boolean;
  viewedAt?: string;
  isExpired?: boolean;
  mediaSavePolicy?: MediaSavePolicy;
  savedBy?: Array<{ userId: string; savedAt: string; username?: string }>;
  screenshotAlerts?: Array<{ userId: string; detectedAt: string; username?: string }>;
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
