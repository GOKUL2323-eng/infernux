# INFERNUX ⚡

> **All-in-One Social Messaging and Media Mobile Platform**
> Built with React Native (Expo SDK 52, Expo Router v4, Zustand), Node.js, Express, TypeScript, MongoDB Atlas, Socket.IO, and LiveKit WebRTC.

Author: [GOKUL2323-eng](https://github.com/GOKUL2323-eng)

---

## 🌟 Highlights & Key Features

1. **🔐 Authentication & User Accounts**
   - Registration, login, JWT with rotating refresh tokens, session revocation.
   - User profile with bio, avatars, cover pictures, follower counts, and account privacy settings.
   - User blocking, reporting, follow requests for private profiles.

2. **🔑 Cryptographic Room-Key Group Communication**
   - High-entropy room invitation keys (`IFNX-XXXX-XXXX-XXXX`) generated with cryptographic security.
   - Server-side SHA-256 key hashing, expiration timestamps, usage limits, and admin key rotation.
   - Separation of public room ID from secret invitation keys to ensure true zero-knowledge authorization.

3. **💬 Real-Time Messaging Engine**
   - Instant messaging over authenticated Socket.IO connections.
   - Direct chats, group rooms, typing indicators, sent/delivered/read receipts.
   - Text, media attachments, emojis, message replies, soft-deletion.
   - Voice audio recording and playback with waveforms and duration indicators.

4. **📞 WebRTC Voice & Video Calling**
   - Genuine high-definition voice and video calling powered by LiveKit SFU.
   - Ringing status, incoming call alerts modal, mute/unmute, camera toggle, camera flip, speakerphone, duration timer, call history.

5. **📱 Instagram-Style Reels**
   - Vertical full-screen short-video feed with smooth snapping, auto-play, pause, like, comment counts, creator follow, and audio attribution.

6. **⏳ 24-Hour Ephemeral Stories**
   - Photo and video stories with audience controls (`all`, `followers`, `close_friends`).
   - Auto-advance progress bars, tap navigation, pause on hold, viewers tracking, direct message replies.
   - Scheduled automatic server cleanup for expired stories.

7. **🎵 Music Collections & Mini-Player**
   - Curated audio catalog, playlist management, search by title/artist/genre.
   - Persistent in-app floating mini-player with play/pause, next track, and close controls.
   - Music track attachment to Social Notes.

8. **📝 Dual-Layer Notes System**
   - **Private Notes**: Encrypted, taggable, searchable, pinnable notes vault isolated strictly to the user.
   - **Social Notes**: Ephemeral 24-hour status updates with emojis and attached music tracks shared with followers.

9. **🎨 Mobile Design System**
   - Vibrant Infernux luxury dark aesthetic (Deep Obsidian `#090A0F`, Crimson Flame `#FF3B30`, Electric Violet `#8A2BE2`).
   - Dynamic Dark and Light mode support.

---

## 📂 Project Structure

```
infernux/
├── apps/
│   ├── mobile/         # React Native mobile application (Expo Router, Zustand)
│   └── server/         # Express API & Socket.IO server (TypeScript, Mongoose, LiveKit)
├── packages/
│   └── shared/         # Shared TypeScript types, Zod schemas, Socket event constants
├── docs/               # System documentation
│   ├── ARCHITECTURE.md     # High-level architecture & data flow
│   ├── API_SPECIFICATION.md# Complete REST API & Socket.IO events reference
│   ├── TESTING_GUIDE.md    # Automated tests & multi-device manual testing guide
│   ├── DEPLOYMENT_GUIDE.md # Production deployment (Render, AWS, LiveKit Cloud, EAS)
│   └── TROUBLESHOOTING.md  # Common issues and solutions
├── package.json        # Monorepo configuration (npm workspaces)
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ or v20+ (v24 supported)
- **MongoDB**: Local MongoDB instance or MongoDB Atlas connection string
- **LiveKit Cloud**: (Optional for local testing; free account at [cloud.livekit.io](https://cloud.livekit.io))

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/GOKUL2323-eng/Infernux.git
cd Infernux

# Install all workspace dependencies
npm install
```

### 3. Build Shared Packages
```bash
npm run build
```

### 4. Running the Backend Server
```bash
npm run dev:server
# Server will run at http://localhost:4000
# Health check: http://localhost:4000/health
```

### 5. Running the Mobile Application
```bash
npm run dev:mobile
# Opens Expo Metro bundler: press 'a' for Android, 'i' for iOS, or 'w' for Web
```

---

## 🧪 Testing & Verification

### Run Automated Tests:
```bash
npm test
```
All 21 test suites cover:
- Cryptographic room key formatting (`IFNX-XXXX-XXXX-XXXX`), entropy, and SHA-256 hashes
- Zod validation schemas for all domain models (Auth, Room, Chat, Call, Post, Reel, Story, Notes)
- Express API integration tests (health endpoint, 404 handler, 422 validation, 401 unauthorized protection)

### Type Checking:
```bash
npm run typecheck
```

---

## 📦 Deployment & Mobile Builds

- Backend Deployment: Render, Railway, AWS ECS, or Fly.io (see [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)).
- Android Build: `eas build --platform android --profile preview` (produces installable APK).
- iOS Build: `eas build --platform ios --profile production` (produces IPA for TestFlight / App Store).

---

## 📄 License
MIT License. Created by [GOKUL2323-eng](https://github.com/GOKUL2323-eng).

