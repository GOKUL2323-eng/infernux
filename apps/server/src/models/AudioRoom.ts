import mongoose, { Schema, Document } from 'mongoose';

export interface IAudioRoomDocument extends Document {
  title: string;
  topic?: string;
  communityId?: mongoose.Types.ObjectId;
  hostId: mongoose.Types.ObjectId;
  status: 'live' | 'ended';
  participants: Array<{
    userId: mongoose.Types.ObjectId;
    username: string;
    displayName: string;
    avatarUrl?: string;
    role: 'host' | 'speaker' | 'listener';
    isMuted: boolean;
    handRaised: boolean;
    lastReaction?: string;
    joinedAt: Date;
  }>;
  speakerRequests: mongoose.Types.ObjectId[];
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AudioRoomSchema = new Schema<IAudioRoomDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    topic: { type: String, maxlength: 120 },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', index: true },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['live', 'ended'], default: 'live', index: true },
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        username: { type: String, required: true },
        displayName: { type: String, required: true },
        avatarUrl: { type: String },
        role: { type: String, enum: ['host', 'speaker', 'listener'], default: 'listener' },
        isMuted: { type: Boolean, default: true },
        handRaised: { type: Boolean, default: false },
        lastReaction: { type: String },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    speakerRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    endedAt: { type: Date },
  },
  { timestamps: true }
);

export const AudioRoom = mongoose.model<IAudioRoomDocument>('AudioRoom', AudioRoomSchema);

