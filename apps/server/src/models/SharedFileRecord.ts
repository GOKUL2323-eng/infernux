import mongoose, { Schema, Document } from 'mongoose';
import { SharedFileCategory, SharedFileScope } from '@infernux/shared';

export interface ISharedFileRecordDocument extends Document {
  ownerId: mongoose.Types.ObjectId;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileUrl: string;
  previewUrl?: string;
  category: SharedFileCategory;
  scope: SharedFileScope;
  scopeId?: string;
  shareToken: string;
  expiresAt?: Date;
  downloadsCount: number;
  createdAt: Date;
}

const SharedFileRecordSchema = new Schema<ISharedFileRecordDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true, trim: true, maxlength: 200 },
    mimeType: { type: String, required: true, maxlength: 120 },
    fileSizeBytes: { type: Number, required: true },
    fileUrl: { type: String, required: true },
    previewUrl: { type: String },
    category: {
      type: String,
      enum: ['image', 'video', 'audio', 'document', 'archive'],
      default: 'document',
    },
    scope: {
      type: String,
      enum: ['personal', 'community', 'chat'],
      default: 'personal',
      index: true,
    },
    scopeId: { type: String, index: true },
    shareToken: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, index: true },
    downloadsCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SharedFileRecord = mongoose.model<ISharedFileRecordDocument>(
  'SharedFileRecord',
  SharedFileRecordSchema
);

