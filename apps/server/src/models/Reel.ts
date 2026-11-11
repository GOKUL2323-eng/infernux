import mongoose, { Schema, Document } from 'mongoose';
import {
  ReelAudioAttribution,
  ReelClipSegment,
  ReelTextOverlay,
} from '@infernux/shared';

export interface IReelDocument extends Document {
  creatorId: mongoose.Types.ObjectId;
  videoUrl: string;
  thumbnailUrl: string;
  caption?: string;
  hashtags: string[];
  audio?: ReelAudioAttribution;
  duration: number;
  trimStartSec?: number;
  trimEndSec?: number;
  playbackSpeed?: number;
  clips?: ReelClipSegment[];
  voiceoverUrl?: string;
  musicVolume?: number;
  voiceoverVolume?: number;
  textOverlays?: ReelTextOverlay[];
  coverTimeSec?: number;
  status: 'draft' | 'scheduled' | 'published';
  scheduledFor?: Date;
  collaboratorIds: mongoose.Types.ObjectId[];
  collabInvites: Array<{
    userId: mongoose.Types.ObjectId;
    status: 'pending' | 'accepted' | 'declined';
  }>;
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
    trimStartSec: { type: Number, default: 0 },
    trimEndSec: { type: Number },
    playbackSpeed: { type: Number, default: 1 },
    clips: { type: Schema.Types.Mixed, default: [] },
    voiceoverUrl: { type: String },
    musicVolume: { type: Number, default: 1 },
    voiceoverVolume: { type: Number, default: 1 },
    textOverlays: { type: Schema.Types.Mixed, default: [] },
    coverTimeSec: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published'],
      default: 'published',
      index: true,
    },
    scheduledFor: { type: Date, index: true },
    collaboratorIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    collabInvites: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
      },
    ],
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

