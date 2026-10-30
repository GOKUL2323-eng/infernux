export interface UserPrivacySettings {
  isPrivate: boolean;
  allowTagging: 'everyone' | 'followers' | 'none';
  showActivityStatus: boolean;
  showLastSeen: boolean;
  allowDirectMessages: 'everyone' | 'followers' | 'none';
}

export interface NotificationPreferences {
  directMessages: boolean;
  roomMessages: boolean;
  calls: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  socialNotes: boolean;
  stories: boolean;
}

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface UserProfile extends UserSummary {
  email: string;
  phoneNumber?: string;
  countryCode?: string;
  normalizedPhoneNumber?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  authenticationProvider?: 'local' | 'phone' | 'google';
  bio?: string;
  coverImageUrl?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  reelsCount: number;
  privacy: UserPrivacySettings;
  notifications: NotificationPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface SendPhoneOtpResponse {
  success: boolean;
  message: string;
  maskedPhoneNumber: string;
  cooldownSeconds: number;
  expiresInSeconds: number;
  isRegistered?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface FollowRelationship {
  followerId: string;
  followingId: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}

export interface BlockRecord {
  blockerId: string;
  blockedId: string;
  createdAt: string;
}
