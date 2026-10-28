import mongoose, { Schema, Document } from 'mongoose';
import { ConversationType } from '@infernux/shared';

export interface IConversationDocument extends Document {
  type: ConversationType;
  participants: mongoose.Types.ObjectId[];
  roomId?: mongoose.Types.ObjectId;
  title?: string;
  avatarUrl?: string;
  lastMessage?: {
    id: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    content: string;
    contentType: string;
    createdAt: Date;
  };
  mutedBy: mongoose.Types.ObjectId[];
  pinnedBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversationDocument>(
  {
    type: {
      type: String,
      enum: ['direct', 'group', 'room'],
      required: true,
      index: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      sparse: true,
      index: true,
    },
    title: { type: String },
    avatarUrl: { type: String },
    lastMessage: {
      id: { type: Schema.Types.ObjectId, ref: 'Message' },
      senderId: { type: Schema.Types.ObjectId, ref: 'User' },
      content: { type: String },
      contentType: { type: String },
      createdAt: { type: Date },
    },
    mutedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    pinnedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
  }
);

// Fast lookups for user conversations sorted by update time
ConversationSchema.index({ participants: 1, updatedAt: -1 });

export const Conversation = mongoose.model<IConversationDocument>('Conversation', ConversationSchema);

