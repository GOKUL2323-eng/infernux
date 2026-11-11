import mongoose, { Schema, Document } from 'mongoose';
import { MoodType } from '@infernux/shared';

export interface IMoodEntryDocument extends Document {
  userId: mongoose.Types.ObjectId;
  mood: MoodType;
  emoji: string;
  note?: string;
  colorHex: string;
  isPublic: boolean;
  createdAt: Date;
}

const MoodEntrySchema = new Schema<IMoodEntryDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mood: {
      type: String,
      enum: ['happy', 'calm', 'hyped', 'focused', 'melancholy', 'grateful', 'tired', 'inspired'],
      required: true,
    },
    emoji: { type: String, required: true, maxlength: 12 },
    note: { type: String, maxlength: 240 },
    colorHex: { type: String, default: '#A020F0' },
    isPublic: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MoodEntrySchema.index({ userId: 1, createdAt: -1 });

export const MoodEntry = mongoose.model<IMoodEntryDocument>('MoodEntry', MoodEntrySchema);
