import mongoose, { Schema, Document } from 'mongoose';
import { TogetherSessionType } from '@infernux/shared';

export interface ITogetherSessionDocument extends Document {
  hostId: mongoose.Types.ObjectId;
  title: string;
  sessionType: TogetherSessionType;
  mediaUrl?: string;
  trackTitle?: string;
  playbackPositionSec: number;
  isPlaying: boolean;
  participantIds: mongoose.Types.ObjectId[];
  status: 'active' | 'ended';
  createdAt: Date;
  updatedAt: Date;
}

const TogetherSessionSchema = new Schema<ITogetherSessionDocument>(
  {
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    sessionType: { type: String, enum: ['watch', 'listen', 'study'], default: 'watch' },
    mediaUrl: { type: String },
    trackTitle: { type: String, maxlength: 120 },
    playbackPositionSec: { type: Number, default: 0 },
    isPlaying: { type: Boolean, default: false },
    participantIds: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    status: { type: String, enum: ['active', 'ended'], default: 'active', index: true },
  },
  { timestamps: true }
);

export const TogetherSession = mongoose.model<ITogetherSessionDocument>(
  'TogetherSession',
  TogetherSessionSchema
);
