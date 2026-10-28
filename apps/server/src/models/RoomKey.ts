import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomKeyDocument extends Document {
  roomId: mongoose.Types.ObjectId;
  keySecret: string; // The plaintext invitation code (displayed to owner/admins)
  keyHash: string; // Hashed version for lookup
  createdBy: mongoose.Types.ObjectId;
  expiresAt: Date | null;
  maxUses: number | null;
  usesCount: number;
  isActive: boolean;
  requiresApproval: boolean;
  createdAt: Date;
}

const RoomKeySchema = new Schema<IRoomKeyDocument>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    keySecret: {
      type: String,
      required: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    maxUses: {
      type: Number,
      default: null,
    },
    usesCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const RoomKey = mongoose.model<IRoomKeyDocument>('RoomKey', RoomKeySchema);

