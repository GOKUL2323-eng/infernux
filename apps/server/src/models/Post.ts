import mongoose, { Schema, Document } from 'mongoose';
import { MediaAttachment } from '@infernux/shared';

export interface IPostDocument extends Document {
  authorId: mongoose.Types.ObjectId;
  caption: string;
  media: MediaAttachment[];
  hashtags: string[];
  mentions: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<MediaAttachment>(
  {
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    type: { type: String, enum: ['image', 'video', 'audio', 'document'], required: true },
    fileName: { type: String },
    fileSize: { type: Number },
    duration: { type: Number },
    width: { type: Number },
    height: { type: Number },
    mimeType: { type: String },
  },
  { _id: false }
);

const PostSchema = new Schema<IPostDocument>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    caption: {
      type: String,
      maxlength: 2200,
      default: '',
    },
    media: {
      type: [MediaSchema],
      required: true,
      validate: [(val: MediaAttachment[]) => val.length > 0, 'At least one media item is required'],
    },
    hashtags: [{ type: String, lowercase: true, trim: true, index: true }],
    mentions: [{ type: String, lowercase: true, trim: true }],
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    isPrivate: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

PostSchema.index({ createdAt: -1 });
PostSchema.index({ authorId: 1, createdAt: -1 });

export const Post = mongoose.model<IPostDocument>('Post', PostSchema);

