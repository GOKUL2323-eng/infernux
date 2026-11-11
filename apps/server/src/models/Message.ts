import mongoose, { Schema, Document } from 'mongoose';
import {
  MessageContentType,
  MediaAttachment,
  DisappearingMode,
  MediaSavePolicy,
  InteractiveMessageData,
} from '@infernux/shared';

export interface IMessageDocument extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  contentType: MessageContentType;
  content: string;
  attachments: MediaAttachment[];
  replyTo?: {
    id: mongoose.Types.ObjectId;
    senderDisplayName: string;
    content: string;
    contentType: MessageContentType;
  };
  forwardedFrom?: {
    messageId: mongoose.Types.ObjectId;
    senderDisplayName: string;
    conversationId?: mongoose.Types.ObjectId;
  };
  reactions: Array<{
    userId: mongoose.Types.ObjectId;
    emoji: string;
    createdAt: Date;
  }>;
  secretReactions: Array<{
    userId: mongoose.Types.ObjectId;
    emoji: string;
    revealedToUserIds: mongoose.Types.ObjectId[];
    createdAt: Date;
  }>;
  interactiveData?: InteractiveMessageData;
  translations?: Record<string, string>;
  voiceTranscript?: {
    text: string;
    status: 'available' | 'unconfigured';
    note?: string;
  };
  receipts: Array<{
    userId: mongoose.Types.ObjectId;
    status: 'sent' | 'delivered' | 'read';
    updatedAt: Date;
  }>;
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  pinnedAt?: Date;
  pinnedBy?: mongoose.Types.ObjectId;
  isScheduled: boolean;
  scheduledFor?: Date;
  scheduleStatus?: 'pending' | 'delivered' | 'cancelled';
  expiresAt?: Date;
  disappearingMode?: DisappearingMode;
  viewOnce: boolean;
  viewedAt?: Date;
  viewedBy: Array<{
    userId: mongoose.Types.ObjectId;
    viewedAt: Date;
  }>;
  isExpired: boolean;
  mediaSavePolicy?: MediaSavePolicy;
  savedBy: Array<{
    userId: mongoose.Types.ObjectId;
    savedAt: Date;
  }>;
  screenshotAlerts: Array<{
    userId: mongoose.Types.ObjectId;
    detectedAt: Date;
  }>;
  clientTempId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const MediaAttachmentSchema = new Schema<MediaAttachment>(
  {
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    type: { type: String, enum: ['image', 'video', 'audio', 'document'], required: true },
    fileName: { type: String },
    fileSize: { type: Number },
    duration: { type: Number },
    width: { type: Number },
    height: { type: Number },
    mimeType: { type: String },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: [
        'text',
        'image',
        'video',
        'audio',
        'document',
        'shared_post',
        'shared_reel',
        'music_reference',
        'call_event',
        'poll',
        'quiz',
        'voting_card',
        'event',
        'checklist',
        'location',
        'contact',
        'task',
      ],
      default: 'text',
    },
    content: {
      type: String,
      default: '',
    },
    attachments: [MediaAttachmentSchema],
    replyTo: {
      id: { type: Schema.Types.ObjectId, ref: 'Message' },
      senderDisplayName: { type: String },
      content: { type: String },
      contentType: { type: String },
    },
    forwardedFrom: {
      messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
      senderDisplayName: { type: String },
      conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    },
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    secretReactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
        revealedToUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        createdAt: { type: Date, default: Date.now },
      },
    ],
    interactiveData: { type: Schema.Types.Mixed },
    translations: { type: Schema.Types.Mixed },
    voiceTranscript: {
      text: { type: String },
      status: { type: String, enum: ['available', 'unconfigured'] },
      note: { type: String },
    },
    receipts: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    pinnedAt: { type: Date },
    pinnedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isScheduled: { type: Boolean, default: false, index: true },
    scheduledFor: { type: Date, index: true },
    scheduleStatus: { type: String, enum: ['pending', 'delivered', 'cancelled'] },
    expiresAt: { type: Date, index: true },
    disappearingMode: { type: String, enum: ['off', 'after_view', '24h', '7d'] },
    viewOnce: { type: Boolean, default: false },
    viewedAt: { type: Date },
    viewedBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    isExpired: { type: Boolean, default: false, index: true },
    mediaSavePolicy: { type: String, enum: ['view_only', 'allow_save', 'view_once', 'keep_in_chat'] },
    savedBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        savedAt: { type: Date, default: Date.now },
      },
    ],
    screenshotAlerts: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        detectedAt: { type: Date, default: Date.now },
      },
    ],
    clientTempId: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

// High-speed index for cursor-based message pagination within a conversation
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, isPinned: 1 });
MessageSchema.index({ scheduleStatus: 1, scheduledFor: 1 });

export const Message = mongoose.model<IMessageDocument>('Message', MessageSchema);

