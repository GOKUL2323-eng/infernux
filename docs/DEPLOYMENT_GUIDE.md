# Infernux Production Deployment & Build Guide

This document describes how to deploy the Infernux backend to production and build the mobile binaries for Android and iOS using Expo EAS.

---

## 1. Backend Deployment (Render / Railway / AWS)

### A. Environment Configuration
Create the following environment variables in your hosting provider's dashboard:

```env
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
API_URL=https://api.infernux.app
CLIENT_URL=https://infernux.app

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/infernux?retryWrites=true&w=majority

# JWT Secrets (Generate with `openssl rand -hex 64`)
JWT_ACCESS_SECRET=your_super_secure_access_token_secret_here
JWT_REFRESH_SECRET=your_super_secure_refresh_token_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# LiveKit WebRTC Cloud
LIVEKIT_HOST=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Media Storage (Cloudinary or S3)
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Expo Push Notifications
EXPO_ACCESS_TOKEN=your_expo_access_token
```

### B. Build & Start Commands
- **Build Command**: `npm run build`
- **Start Command**: `npm run start --workspace=apps/server`
- **Health Check Path**: `/health`

---

## 2. LiveKit Cloud Setup

1. Sign up at [cloud.livekit.io](https://cloud.livekit.io).
2. Create a new project named `infernux-prod`.
3. Copy the WebSocket Host URL (`wss://...`), API Key, and API Secret into the backend environment variables.
4. LiveKit Cloud automatically provisions global TURN/STUN servers to ensure connection reliability across all cellular carriers and restrictive corporate firewalls.

---

## 3. Mobile Build Process (Expo EAS)

### Prerequisites
Install EAS CLI globally and log in:
```bash
npm install -g eas-cli
eas login
```

### Configure `apps/mobile/eas.json`
```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### A. Android Build

1. **Standalone APK (for testing on physical devices)**:
   ```bash
   cd apps/mobile
   eas build --platform android --profile preview
   ```
2. **Production Android App Bundle (.aab for Google Play Store submission)**:
   ```bash
   eas build --platform android --profile production
   ```

### B. iOS Build (Apple App Store & TestFlight)

1. Ensure your Apple Developer Account is active.
2. Run:
   ```bash
   cd apps/mobile
   eas build --platform ios --profile production
   ```
3. Submit to TestFlight / App Store:
   ```bash
   eas submit --platform ios
   ```

---

## 4. Native Permissions Configuration

The mobile application specifies all required iOS InfoPlist keys and Android permissions in `apps/mobile/app.json`:
- `NSCameraUsageDescription`: Camera access for photos, videos, reels, and video calls.
- `NSMicrophoneUsageDescription`: Microphone access for voice notes and calls.
- `NSPhotoLibraryUsageDescription`: Photo selection from library.
- Android Permissions: `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `POST_NOTIFICATIONS`.

