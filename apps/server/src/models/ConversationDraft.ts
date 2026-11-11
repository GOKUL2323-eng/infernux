import mongoose, { Schema, Document } from 'mongoose';

export interface IConversationDraftDocument extends Document {
  userId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationDraftSchema = new Schema<IConversationDraftDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    content: { type: String, default: '', maxlength: 4000 },
  },
  { timestamps: true }
);

ConversationDraftSchema.index({ userId: 1, conversationId: 1 }, { unique: true });

export const ConversationDraft = mongoose.model<IConversationDraftDocument>(
  'ConversationDraft',
  ConversationDraftSchema
);

