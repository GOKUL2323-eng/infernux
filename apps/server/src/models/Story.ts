import mongoose, { Schema, Document } from 'mongoose';
import { StoryMediaType, StoryAudience, StorySticker } from '@infernux/shared';

export interface IStoryDocument extends Document {
  creatorId: mongoose.Types.ObjectId;
  mediaType: StoryMediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  audience: StoryAudience;
  allowedUserIds: mongoose.Types.ObjectId[];
  collaboratorIds: mongoose.Types.ObjectId[];
  stickers: StorySticker[];
  reactions: Array<{
    userId: mongoose.Types.ObjectId;
    emoji: string;
    createdAt: Date;
  }>;
  duration: number;
  viewsCount: number;
  expiresAt: Date;
  isExpired: boolean;
  createdAt: Date;
}

const StorySchema = new Schema<IStoryDocument>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: { type: String },
    caption: { type: String, maxlength: 200 },
    audience: {
      type: String,
      enum: ['all', 'followers', 'close_friends', 'custom'],
      default: 'all',
    },
    allowedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    collaboratorIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    stickers: { type: Schema.Types.Mixed, default: [] },
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    duration: { type: Number, default: 5 },
    viewsCount: { type: Number, default: 0 },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isExpired: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

StorySchema.index({ creatorId: 1, isExpired: 1, expiresAt: 1 });

export const Story = mongoose.model<IStoryDocument>('Story', StorySchema);

