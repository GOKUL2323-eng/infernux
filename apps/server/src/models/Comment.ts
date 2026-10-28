import mongoose, { Schema, Document } from 'mongoose';

export interface ICommentDocument extends Document {
  postId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  content: string;
  replyToCommentId?: mongoose.Types.ObjectId;
  likesCount: number;
  createdAt: Date;
}

const CommentSchema = new Schema<ICommentDocument>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
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
    replyToCommentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      sparse: true,
    },
    likesCount: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

CommentSchema.index({ postId: 1, createdAt: -1 });

export const Comment = mongoose.model<ICommentDocument>('Comment', CommentSchema);
