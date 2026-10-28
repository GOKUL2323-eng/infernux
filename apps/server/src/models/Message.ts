import mongoose, { Schema, Document } from 'mongoose';
import { MessageContentType, MediaAttachment } from '@infernux/shared';

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
  reactions: Array<{
    userId: mongoose.Types.ObjectId;
    emoji: string;
    createdAt: Date;
  }>;
  receipts: Array<{
    userId: mongoose.Types.ObjectId;
    status: 'sent' | 'delivered' | 'read';
    updatedAt: Date;
  }>;
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
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
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
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
    clientTempId: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

// High-speed index for cursor-based message pagination within a conversation
MessageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessageDocument>('Message', MessageSchema);

