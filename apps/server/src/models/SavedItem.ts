import mongoose, { Schema, Document } from 'mongoose';

export interface ISavedItemDocument extends Document {
  userId: mongoose.Types.ObjectId;
  itemType: 'post' | 'reel';
  itemId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const SavedItemSchema = new Schema<ISavedItemDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    itemType: {
      type: String,
      enum: ['post', 'reel'],
      required: true,
      index: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

SavedItemSchema.index({ userId: 1, itemType: 1, itemId: 1 }, { unique: true });
SavedItemSchema.index({ userId: 1, createdAt: -1 });

export const SavedItem = mongoose.model<ISavedItemDocument>('SavedItem', SavedItemSchema);

