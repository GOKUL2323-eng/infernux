import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  clientUrl: process.env.CLIENT_URL || '*',
  apiUrl: process.env.API_URL || 'http://localhost:4000',

  // MongoDB
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/infernux',

  // JWT Security
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'infernux-dev-access-super-secret-key-change-in-prod-12345',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'infernux-dev-refresh-super-secret-key-change-in-prod-67890',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // LiveKit WebRTC Calling
  livekit: {
    host: process.env.LIVEKIT_HOST || 'wss://infernux.livekit.cloud',
    apiKey: process.env.LIVEKIT_API_KEY || 'devkey',
    apiSecret: process.env.LIVEKIT_API_SECRET || 'secretkey1234567890abcdef',
  },

  // Storage (Cloudinary / Local)
  storage: {
    provider: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 'cloudinary' | 's3',
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    },
    localUploadDir: path.resolve(__dirname, '../../uploads'),
  },

  // Expo Push Notifications
  expo: {
    accessToken: process.env.EXPO_ACCESS_TOKEN || '',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 mins
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  },
};

