import mongoose, { Schema, Document } from 'mongoose';

export interface IModerationLogDocument extends Document {
  actorId: mongoose.Types.ObjectId;
  action: string;
  targetType: string;
  targetId: mongoose.Types.ObjectId;
  reason?: string;
  createdAt: Date;
}

const ModerationLogSchema = new Schema<IModerationLogDocument>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: { type: String, required: true, trim: true, maxlength: 80 },
    targetType: { type: String, required: true, trim: true, maxlength: 60 },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reason: { type: String, maxlength: 500 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ModerationLogSchema.index({ createdAt: -1 });

export const ModerationLog = mongoose.model<IModerationLogDocument>('ModerationLog', ModerationLogSchema);
