import mongoose, { Schema, Document } from 'mongoose';
import { RoomRole } from '@infernux/shared';

export interface IRoomMemberDocument extends Document {
  roomId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: RoomRole;
  isMuted: boolean;
  joinedAt: Date;
}

const RoomMemberSchema = new Schema<IRoomMemberDocument>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'moderator', 'member'],
      default: 'member',
      index: true,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

RoomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });

export const RoomMember = mongoose.model<IRoomMemberDocument>('RoomMember', RoomMemberSchema);
