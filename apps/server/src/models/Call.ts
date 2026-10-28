import mongoose, { Schema, Document } from 'mongoose';
import { CallType, CallStatus } from '@infernux/shared';

export interface ICallDocument extends Document {
  callType: CallType;
  channelName: string;
  initiatorId: mongoose.Types.ObjectId;
  recipientId?: mongoose.Types.ObjectId;
  roomId?: mongoose.Types.ObjectId;
  status: CallStatus;
  startedAt: Date;
  connectedAt?: Date;
  endedAt?: Date;
  duration?: number;
  participants: Array<{
    userId: mongoose.Types.ObjectId;
    joinedAt?: Date;
    leftAt?: Date;
    isMuted: boolean;
    isVideoEnabled: boolean;
  }>;
}

const CallSchema = new Schema<ICallDocument>(
  {
    callType: {
      type: String,
      enum: ['voice', 'video'],
      required: true,
    },
    channelName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    initiatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'initiating',
        'ringing',
        'connected',
        'ended',
        'declined',
        'missed',
        'busy',
        'failed',
      ],
      default: 'initiating',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    connectedAt: { type: Date },
    endedAt: { type: Date },
    duration: { type: Number, default: 0 },
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        joinedAt: { type: Date },
        leftAt: { type: Date },
        isMuted: { type: Boolean, default: false },
        isVideoEnabled: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: false,
  }
);

// High-speed index for user call history
CallSchema.index({ initiatorId: 1, startedAt: -1 });
CallSchema.index({ recipientId: 1, startedAt: -1 });

export const Call = mongoose.model<ICallDocument>('Call', CallSchema);
