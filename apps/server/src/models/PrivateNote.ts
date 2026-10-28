import mongoose, { Schema, Document } from 'mongoose';

export interface IPrivateNoteDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  tags: string[];
  folder?: string;
  isPinned: boolean;
  isArchived: boolean;
  reminderAt?: Date;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PrivateNoteSchema = new Schema<IPrivateNoteDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    content: { type: String, default: '' },
    tags: [{ type: String, trim: true, lowercase: true }],
    folder: { type: String, trim: true },
    isPinned: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    reminderAt: { type: Date },
    attachments: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

PrivateNoteSchema.index({ userId: 1, isArchived: 1, isPinned: -1, updatedAt: -1 });

export const PrivateNote = mongoose.model<IPrivateNoteDocument>('PrivateNote', PrivateNoteSchema);

