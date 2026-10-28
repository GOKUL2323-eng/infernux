import mongoose, { Schema, Document } from 'mongoose';

export interface IReelCommentDocument extends Document {
  reelId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  content: string;
  likesCount: number;
  createdAt: Date;
}

const ReelCommentSchema = new Schema<IReelCommentDocument>(
  {
    reelId: {
      type: Schema.Types.ObjectId,
      ref: 'Reel',
      required: true,
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    likesCount: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ReelCommentSchema.index({ reelId: 1, createdAt: -1 });

export const ReelComment = mongoose.model<IReelCommentDocument>('ReelComment', ReelCommentSchema);

