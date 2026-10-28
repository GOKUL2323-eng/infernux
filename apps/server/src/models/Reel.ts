import mongoose, { Schema, Document } from 'mongoose';
import { ReelAudioAttribution } from '@infernux/shared';

export interface IReelDocument extends Document {
  creatorId: mongoose.Types.ObjectId;
  videoUrl: string;
  thumbnailUrl: string;
  caption?: string;
  hashtags: string[];
  audio?: ReelAudioAttribution;
  duration: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReelSchema = new Schema<IReelDocument>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    hashtags: [{ type: String, lowercase: true, trim: true, index: true }],
    audio: {
      id: { type: String },
      title: { type: String },
      artist: { type: String },
      audioUrl: { type: String },
    },
    duration: {
      type: Number,
      required: true,
      max: 90,
    },
    viewsCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

ReelSchema.index({ createdAt: -1 });
ReelSchema.index({ creatorId: 1, createdAt: -1 });

export const Reel = mongoose.model<IReelDocument>('Reel', ReelSchema);

