import mongoose, { Schema, Document } from 'mongoose';

export interface IOtpVerificationDocument extends Document {
  phoneNumber: string;
  countryCode: string;
  purpose: 'login' | 'register' | 'change_phone';
  otpHash: string;
  attempts: number;
  verified: boolean;
  verifiedAt?: Date;
  userId?: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OtpVerificationSchema = new Schema<IOtpVerificationDocument>(
  {
    phoneNumber: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    countryCode: {
      type: String,
      default: '+91',
    },
    purpose: {
      type: String,
      enum: ['login', 'register', 'change_phone'],
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL auto-cleanup after expiry
    },
  },
  {
    timestamps: true,
  }
);

OtpVerificationSchema.index({ phoneNumber: 1, purpose: 1, createdAt: -1 });

export const OtpVerification = mongoose.model<IOtpVerificationDocument>(
  'OtpVerification',
  OtpVerificationSchema
);

