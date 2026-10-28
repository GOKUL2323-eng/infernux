import mongoose, { Schema, Document } from 'mongoose';

export interface IStoryViewDocument extends Document {
  storyId: mongoose.Types.ObjectId;
  viewerId: mongoose.Types.ObjectId;
  viewedAt: Date;
}

const StoryViewSchema = new Schema<IStoryViewDocument>(
  {
    storyId: {
      type: Schema.Types.ObjectId,
      ref: 'Story',
      required: true,
      index: true,
    },
    viewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

StoryViewSchema.index({ storyId: 1, viewerId: 1 }, { unique: true });

export const StoryView = mongoose.model<IStoryViewDocument>('StoryView', StoryViewSchema);
