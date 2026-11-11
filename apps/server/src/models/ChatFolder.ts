import mongoose, { Schema, Document } from 'mongoose';

export interface IChatFolderDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  color?: string;
  icon?: string;
  conversationIds: mongoose.Types.ObjectId[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChatFolderSchema = new Schema<IChatFolderDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    color: { type: String, default: '#A020F0' },
    icon: { type: String, default: 'folder-outline' },
    conversationIds: [{ type: Schema.Types.ObjectId, ref: 'Conversation' }],
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ChatFolderSchema.index({ userId: 1, name: 1 }, { unique: true });

export const ChatFolder = mongoose.model<IChatFolderDocument>('ChatFolder', ChatFolderSchema);

