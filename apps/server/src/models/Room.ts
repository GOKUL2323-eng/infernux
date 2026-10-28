import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomDocument extends Document {
  name: string;
  description?: string;
  avatarUrl?: string;
  ownerId: mongoose.Types.ObjectId;
  isPrivate: boolean;
  memberCount: number;
  maxMembers: number;
  requiresApproval: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoomDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    description: {
      type: String,
      maxlength: 250,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isPrivate: {
      type: Boolean,
      default: true,
    },
    memberCount: {
      type: Number,
      default: 1,
    },
    maxMembers: {
      type: Number,
      default: 500,
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Room = mongoose.model<IRoomDocument>('Room', RoomSchema);

