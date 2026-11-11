import mongoose, { Schema, Document } from 'mongoose';

export interface IMemoryCapsuleDocument extends Document {
  creatorId: mongoose.Types.ObjectId;
  recipientIds: mongoose.Types.ObjectId[];
  title: string;
  message: string;
  mediaUrls: string[];
  unlockAt: Date;
  unlockedNotified: boolean;
  createdAt: Date;
}

const MemoryCapsuleSchema = new Schema<IMemoryCapsuleDocument>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientIds: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 2000 },
    mediaUrls: [{ type: String }],
    unlockAt: { type: Date, required: true, index: true },
    unlockedNotified: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const MemoryCapsule = mongoose.model<IMemoryCapsuleDocument>(
  'MemoryCapsule',
  MemoryCapsuleSchema
);

