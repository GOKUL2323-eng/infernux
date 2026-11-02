import mongoose, { Schema, Document } from 'mongoose';
import { DisappearingMode, MediaSavePolicy } from '@infernux/shared';

export interface IRoomDocument extends Document {
  name: string;
  description?: string;
  avatarUrl?: string;
  ownerId: mongoose.Types.ObjectId;
  isPrivate: boolean;
  memberCount: number;
  maxMembers: number;
  requiresApproval: boolean;
  disappearingMode: DisappearingMode;
  mediaSavePolicy: MediaSavePolicy;
  isDeleting: boolean;
  deletedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
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
    disappearingMode: {
      type: String,
      enum: ['off', 'after_view', '24h', '7d'],
      default: '24h',
    },
    mediaSavePolicy: {
      type: String,
      enum: ['view_only', 'allow_save', 'view_once', 'keep_in_chat'],
      default: 'allow_save',
    },
    isDeleting: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Room = mongoose.model<IRoomDocument>('Room', RoomSchema);

