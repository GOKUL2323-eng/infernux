import mongoose, { Schema, Document } from 'mongoose';

export interface ILikeDocument extends Document {
  userId: mongoose.Types.ObjectId;
  targetType: 'post' | 'comment' | 'reel' | 'social_note';
  targetId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const LikeSchema = new Schema<ILikeDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['post', 'comment', 'reel', 'social_note'],
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

LikeSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

export const Like = mongoose.model<ILikeDocument>('Like', LikeSchema);

