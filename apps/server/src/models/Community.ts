import mongoose, { Schema, Document } from 'mongoose';
import { CommunityRole } from '@infernux/shared';

export interface ICommunityDocument extends Document {
  name: string;
  description: string;
  category: string;
  iconUrl?: string;
  bannerUrl?: string;
  isPrivate: boolean;
  ownerId: mongoose.Types.ObjectId;
  members: Array<{
    userId: mongoose.Types.ObjectId;
    role: CommunityRole;
    joinedAt: Date;
  }>;
  bannedUserIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CommunitySchema = new Schema<ICommunityDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80, index: true },
    description: { type: String, default: 'Community space on MOZHI', maxlength: 500 },
    category: { type: String, default: 'general', index: true },
    iconUrl: { type: String },
    bannerUrl: { type: String },
    isPrivate: { type: Boolean, default: false },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'moderator', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    bannedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

CommunitySchema.index({ 'members.userId': 1 });

export const Community = mongoose.model<ICommunityDocument>('Community', CommunitySchema);
