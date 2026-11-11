import mongoose, { Schema, Document } from 'mongoose';

export interface IMessageReminderDocument extends Document {
  userId: mongoose.Types.ObjectId;
  messageId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  remindAt: Date;
  note?: string;
  messagePreview?: string;
  status: 'pending' | 'triggered' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}

const MessageReminderSchema = new Schema<IMessageReminderDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    remindAt: { type: Date, required: true, index: true },
    note: { type: String, maxlength: 250 },
    messagePreview: { type: String, maxlength: 200 },
    status: {
      type: String,
      enum: ['pending', 'triggered', 'dismissed'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

MessageReminderSchema.index({ status: 1, remindAt: 1 });

export const MessageReminder = mongoose.model<IMessageReminderDocument>(
  'MessageReminder',
  MessageReminderSchema
);

