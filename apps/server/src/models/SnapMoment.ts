import mongoose, { Schema, Document } from 'mongoose';
import { SnapFilterPreset, SnapOverlayItem } from '@infernux/shared';

export interface ISnapMomentDocument extends Document {
  senderId: mongoose.Types.ObjectId;
  recipientIds: mongoose.Types.ObjectId[];
  mediaType: 'image' | 'video';
  mediaUrl: string;
  caption?: string;
  filter: SnapFilterPreset;
  overlays: SnapOverlayItem[];
  disappearingSeconds: number;
  allowReplay: boolean;
  replayedByIds: mongoose.Types.ObjectId[];
  viewedByIds: mongoose.Types.ObjectId[];
  screenshotAlerts: Array<{
    userId: mongoose.Types.ObjectId;
    username?: string;
    detectedAt: Date;
  }>;
  expiresAt: Date;
  isExpired: boolean;
  createdAt: Date;
}

const SnapMomentSchema = new Schema<ISnapMomentDocument>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }],
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    mediaUrl: { type: String, required: true },
    caption: { type: String, maxlength: 240 },
    filter: {
      type: String,
      enum: ['normal', 'neon', 'noir', 'vivid', 'vaporwave', 'warm'],
      default: 'normal',
    },
    overlays: { type: Schema.Types.Mixed, default: [] },
    disappearingSeconds: { type: Number, default: 10 },
    allowReplay: { type: Boolean, default: true },
    replayedByIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    viewedByIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    screenshotAlerts: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        username: { type: String },
        detectedAt: { type: Date, default: Date.now },
      },
    ],
    expiresAt: { type: Date, required: true, index: true },
    isExpired: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SnapMomentSchema.index({ recipientIds: 1, createdAt: -1 });

export const SnapMoment = mongoose.model<ISnapMomentDocument>('SnapMoment', SnapMomentSchema);

