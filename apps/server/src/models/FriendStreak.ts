import mongoose, { Schema, Document } from 'mongoose';

export interface IFriendStreakDocument extends Document {
  userPairKey: string;
  userIds: mongoose.Types.ObjectId[];
  currentStreak: number;
  longestStreak: number;
  lastInteractionDate?: string; // YYYY-MM-DD (UTC)
  lastMessageAt?: Date;
  status: 'active' | 'at_risk' | 'broken';
  remindersEnabledBy: mongoose.Types.ObjectId[];
  hiddenBy: mongoose.Types.ObjectId[];
  recoveries: Array<{
    userId: mongoose.Types.ObjectId;
    monthKey: string; // YYYY-MM
    count: number;
  }>;
  maxRecoveriesPerMonth: number;
  lastRecoveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FriendStreakSchema = new Schema<IFriendStreakDocument>(
  {
    userPairKey: { type: String, required: true, unique: true, index: true },
    userIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }],
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastInteractionDate: { type: String },
    lastMessageAt: { type: Date },
    status: {
      type: String,
      enum: ['active', 'at_risk', 'broken'],
      default: 'active',
      index: true,
    },
    remindersEnabledBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    hiddenBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    recoveries: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        monthKey: { type: String },
        count: { type: Number, default: 0 },
      },
    ],
    maxRecoveriesPerMonth: { type: Number, default: 3 },
    lastRecoveredAt: { type: Date },
  },
  { timestamps: true }
);

export const FriendStreak = mongoose.model<IFriendStreakDocument>(
  'FriendStreak',
  FriendStreakSchema
);

