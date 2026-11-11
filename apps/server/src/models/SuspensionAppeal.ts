import mongoose, { Schema, Document } from 'mongoose';

export interface ISuspensionAppealDocument extends Document {
  userId: mongoose.Types.ObjectId;
  reason: string;
  details?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerId?: mongoose.Types.ObjectId;
  reviewerNotes?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

const SuspensionAppealSchema = new Schema<ISuspensionAppealDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    details: { type: String, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewerNotes: { type: String, trim: true, maxlength: 500 },
    resolvedAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

SuspensionAppealSchema.index({ status: 1, createdAt: -1 });

export const SuspensionAppeal = mongoose.model<ISuspensionAppealDocument>(
  'SuspensionAppeal',
  SuspensionAppealSchema
);
