import mongoose, { Schema, Document } from 'mongoose';
import { CommunityChannelType } from '@infernux/shared';

export interface ICommunityChannelDocument extends Document {
  communityId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  type: CommunityChannelType;
  isAnnouncementOnly: boolean;
  postsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CommunityChannelSchema = new Schema<ICommunityChannelDocument>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, maxlength: 240 },
    type: {
      type: String,
      enum: ['announcement', 'discussion', 'thread', 'resources'],
      default: 'discussion',
    },
    isAnnouncementOnly: { type: Boolean, default: false },
    postsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const CommunityChannel = mongoose.model<ICommunityChannelDocument>(
  'CommunityChannel',
  CommunityChannelSchema
);
