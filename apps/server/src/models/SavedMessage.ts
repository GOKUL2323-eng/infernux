import mongoose, { Schema, Document } from 'mongoose';

export interface ISavedMessageDocument extends Document {
  userId: mongoose.Types.ObjectId;
  messageId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  collectionName: string;
  note?: string;
  isImportant: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SavedMessageSchema = new Schema<ISavedMessageDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    collectionName: { type: String, default: 'Saved', maxlength: 60 },
    note: { type: String, maxlength: 250 },
    isImportant: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

SavedMessageSchema.index({ userId: 1, messageId: 1 }, { unique: true });
SavedMessageSchema.index({ userId: 1, collectionName: 1, createdAt: -1 });

export const SavedMessage = mongoose.model<ISavedMessageDocument>(
  'SavedMessage',
  SavedMessageSchema
);

