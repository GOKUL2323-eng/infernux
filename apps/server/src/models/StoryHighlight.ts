import mongoose, { Schema, Document } from 'mongoose';

export interface IStoryHighlightDocument extends Document {
  ownerId: mongoose.Types.ObjectId;
  title: string;
  coverUrl?: string;
  storyIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const StoryHighlightSchema = new Schema<IStoryHighlightDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 60 },
    coverUrl: { type: String },
    storyIds: [{ type: Schema.Types.ObjectId, ref: 'Story' }],
  },
  { timestamps: true }
);

export const StoryHighlight = mongoose.model<IStoryHighlightDocument>(
  'StoryHighlight',
  StoryHighlightSchema
);

