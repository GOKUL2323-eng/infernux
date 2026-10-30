import mongoose, { Schema, Document } from 'mongoose';
import { UserProfile, UserPrivacySettings, NotificationPreferences } from '@infernux/shared';

export interface IUserDocument extends Document {
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  phoneNumber?: string;
  countryCode?: string;
  normalizedPhoneNumber?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: Date;
  authenticationProvider?: 'local' | 'phone' | 'google';
  isVerified: boolean;
  isOnline: boolean;
  lastSeen: Date;
  privacy: UserPrivacySettings;
  notifications: NotificationPreferences;
  pushTokens: string[];
  followersCount: number;
  followingCount: number;
  postsCount: number;
  reelsCount: number;
  createdAt: Date;
  updatedAt: Date;
  toProfileJSON(): UserProfile;
}

const PrivacySchema = new Schema<UserPrivacySettings>(
  {
    isPrivate: { type: Boolean, default: false },
    allowTagging: { type: String, enum: ['everyone', 'followers', 'none'], default: 'everyone' },
    showActivityStatus: { type: Boolean, default: true },
    showLastSeen: { type: Boolean, default: true },
    allowDirectMessages: { type: String, enum: ['everyone', 'followers', 'none'], default: 'everyone' },
  },
  { _id: false }
);

const NotificationPrefSchema = new Schema<NotificationPreferences>(
  {
    directMessages: { type: Boolean, default: true },
    roomMessages: { type: Boolean, default: true },
    calls: { type: Boolean, default: true },
    likes: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    follows: { type: Boolean, default: true },
    socialNotes: { type: Boolean, default: true },
    stories: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserSchema = new Schema<IUserDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    bio: {
      type: String,
      maxlength: 300,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    coverImageUrl: {
      type: String,
      default: '',
    },
    phoneNumber: {
      type: String,
      sparse: true,
    },
    countryCode: {
      type: String,
      default: '+91',
    },
    normalizedPhoneNumber: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerifiedAt: {
      type: Date,
    },
    authenticationProvider: {
      type: String,
      enum: ['local', 'phone', 'google'],
      default: 'local',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    privacy: {
      type: PrivacySchema,
      default: () => ({}),
    },
    notifications: {
      type: NotificationPrefSchema,
      default: () => ({}),
    },
    pushTokens: [{ type: String }],
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    reelsCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

UserSchema.methods.toProfileJSON = function (): UserProfile {
  return {
    id: this._id.toString(),
    username: this.username,
    displayName: this.displayName,
    email: this.email,
    phoneNumber: this.phoneNumber,
    countryCode: this.countryCode,
    normalizedPhoneNumber: this.normalizedPhoneNumber,
    phoneVerified: this.phoneVerified,
    phoneVerifiedAt: this.phoneVerifiedAt ? this.phoneVerifiedAt.toISOString() : undefined,
    authenticationProvider: this.authenticationProvider,
    bio: this.bio,
    avatarUrl: this.avatarUrl,
    coverImageUrl: this.coverImageUrl,
    isVerified: this.isVerified,
    isOnline: this.privacy.showActivityStatus ? this.isOnline : undefined,
    lastSeen: this.privacy.showLastSeen ? this.lastSeen.toISOString() : undefined,
    followersCount: this.followersCount,
    followingCount: this.followingCount,
    postsCount: this.postsCount,
    reelsCount: this.reelsCount,
    privacy: this.privacy,
    notifications: this.notifications,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const User = mongoose.model<IUserDocument>('User', UserSchema);

