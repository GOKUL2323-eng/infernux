import mongoose, { Schema, Document } from 'mongoose';
import { ReportReason, ReportTargetType, ReportStatus } from '@infernux/shared';

export interface IReportDocument extends Document {
  reporterId: mongoose.Types.ObjectId;
  targetType: ReportTargetType;
  targetId: mongoose.Types.ObjectId;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  createdAt: Date;
  resolvedAt?: Date;
}

const ReportSchema = new Schema<IReportDocument>(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['user', 'post', 'reel', 'story', 'message', 'room', 'social_note'],
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: [
        'spam',
        'harassment',
        'hate_speech',
        'violence',
        'nudity',
        'copyright',
        'impersonation',
        'other',
      ],
      required: true,
    },
    description: { type: String, maxlength: 1000 },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    resolvedAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ReportSchema.index({ targetType: 1, targetId: 1 });

export const Report = mongoose.model<IReportDocument>('Report', ReportSchema);
