import mongoose, { Schema, Document } from 'mongoose';
import { StoryMediaType, StoryAudience } from '@infernux/shared';

export interface IStoryDocument extends Document {
  creatorId: mongoose.Types.ObjectId;
  mediaType: StoryMediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  audience: StoryAudience;
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
      enum: ['all', 'followers', 'close_friends'],
      default: 'all',
    },
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

