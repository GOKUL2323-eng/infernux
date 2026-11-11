import mongoose, { Schema, Document } from 'mongoose';

export interface ILoginActivityDocument extends Document {
  userId: mongoose.Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failed';
  reason?: string;
  createdAt: Date;
}

const LoginActivitySchema = new Schema<ILoginActivityDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    status: {
      type: String,
      enum: ['success', 'failed'],
      required: true,
    },
    reason: { type: String, maxlength: 200 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

LoginActivitySchema.index({ userId: 1, createdAt: -1 });

export const LoginActivity = mongoose.model<ILoginActivityDocument>('LoginActivity', LoginActivitySchema);
