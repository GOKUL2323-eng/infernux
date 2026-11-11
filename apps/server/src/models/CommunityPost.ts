import mongoose, { Schema, Document } from 'mongoose';
import { MediaAttachment } from '@infernux/shared';

export interface ICommunityPostDocument extends Document {
  communityId: mongoose.Types.ObjectId;
  channelId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  title?: string;
  content: string;
  attachments: MediaAttachment[];
  pinned: boolean;
  parentPostId?: mongoose.Types.ObjectId;
  repliesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CommunityPostSchema = new Schema<ICommunityPostDocument>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'CommunityChannel', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, maxlength: 160 },
    content: { type: String, required: true, maxlength: 4000 },
    attachments: { type: Schema.Types.Mixed, default: [] },
    pinned: { type: Boolean, default: false },
    parentPostId: { type: Schema.Types.ObjectId, ref: 'CommunityPost', index: true },
    repliesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CommunityPostSchema.index({ channelId: 1, pinned: -1, createdAt: -1 });

export const CommunityPost = mongoose.model<ICommunityPostDocument>(
  'CommunityPost',
  CommunityPostSchema
);
