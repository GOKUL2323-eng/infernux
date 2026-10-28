import mongoose, { Schema, Document } from 'mongoose';
import { SocialNoteAudience } from '@infernux/shared';

export interface ISocialNoteDocument extends Document {
  authorId: mongoose.Types.ObjectId;
  text: string;
  emoji?: string;
  musicTrackId?: mongoose.Types.ObjectId;
  audience: SocialNoteAudience;
  likesCount: number;
  expiresAt: Date;
  isExpired: boolean;
  createdAt: Date;
}

const SocialNoteSchema = new Schema<ISocialNoteDocument>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: { type: String, required: true, trim: true, maxlength: 100 },
    emoji: { type: String, maxlength: 8 },
    musicTrackId: {
      type: Schema.Types.ObjectId,
      ref: 'MusicTrack',
    },
    audience: {
      type: String,
      enum: ['followers', 'close_friends'],
      default: 'followers',
    },
    likesCount: { type: Number, default: 0 },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isExpired: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

SocialNoteSchema.index({ authorId: 1, isExpired: 1, expiresAt: 1 });

export const SocialNote = mongoose.model<ISocialNoteDocument>('SocialNote', SocialNoteSchema);
