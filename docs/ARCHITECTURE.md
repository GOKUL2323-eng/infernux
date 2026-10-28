# Infernux System Architecture

Infernux is a complete, production-ready, cross-platform mobile application combining real-time messaging, cryptographic room-key-based group communication, WebRTC voice and video calling, Instagram-style Reels, Stories, social posts, music streaming, and dual-layer private and social notes.

---

## 1. High-Level Monorepo Architecture

```
infernux/
├── apps/
│   ├── mobile/         # React Native mobile application (Expo SDK 52, Expo Router v4, Zustand)
│   └── server/         # Express.js API & Socket.IO server (TypeScript, Mongoose, LiveKit SDK)
├── packages/
│   └── shared/         # Shared TypeScript interfaces, Zod schemas, Socket event constants, API routes
└── docs/               # System architecture, API specs, testing & deployment guides
```

### Component Interaction Diagram

```
+-----------------------------------------------------------------------------------+
|                                 INFERNUX CLIENTS                                  |
|                          (React Native / Expo iOS & Android)                      |
+---------------------+-------------------------------+-----------------------------+
                      |                               |
       HTTPS REST API |           WebSocket           | LiveKit WebRTC
       (Tokens / Data)|        (Real-time State)      | (Audio/Video Media Streams)
                      v                               v                             v
+---------------------+-------+       +---------------+---------------+       +-----+-----+
|        EXPRESS BACKEND      |       |      SOCKET.IO SERVER         |       |  LIVEKIT  |
| - Authentication & Sessions |       | - Online / Offline Presence   |       |    SFU    |
| - Room Keys Cryptography    |<----->| - Instant Message Relay       |       |  SERVER   |
| - Posts, Reels & Stories    |       | - Typing Indicators & Receipts|       +-----------+
| - Notes & Music Catalog     |       | - Real-time Call Signaling    |
+---------------------+-------+       +---------------+---------------+
                      |
                      v
+---------------------+-----------------------+
|                 MONGODB ATLAS               |
| - Users, Sessions, Follows, Blocks          |
| - Rooms, RoomKeys (SHA-256), RoomMembers    |
| - Conversations, Messages, Reactions        |
| - Posts, Reels, Stories (24h TTL), Notes    |
+---------------------------------------------+
```

---

## 2. Security & Cryptographic Room-Key Architecture

Infernux treats room identifiers and room keys as two distinct architectural entities:

1. **Room ID (`_id`)**: The public database identifier for internal database references and routing. Knowledge of a room ID **never** grants message access or membership.
2. **Cryptographic Room Key (`IFNX-XXXX-XXXX-XXXX`)**:
   - Generated using 12 cryptographically random bytes via `crypto.randomBytes(12)` formatted in a collision-resistant custom Base32 alphabet.
   - Stored in MongoDB using a SHA-256 hash (`keyHash`).
   - Supports expiration timestamps (`expiresAt`), maximum uses count (`maxUses`), active status revocation, and admin key rotation.
   - Server-enforced membership authorization is required for every REST request and Socket.IO event.

---

## 3. Real-Time WebRTC Calling Architecture

- **Signaling Layer**: Authenticated Socket.IO events (`call:initiate`, `call:incoming`, `call:accepted`, `call:rejected`, `call:ended`, `call:busy`).
- **Media Engine**: Official LiveKit SFU (Selective Forwarding Unit) Mobile SDK.
- **Access Control**: Backend issues short-lived (1-hour TTL) JWT tokens via `livekit-server-sdk` with granular publish and subscribe grants.
- **Fail-Safe Call Lifecycle**: Calls track transitions from `initiating` -> `ringing` -> `connected` -> `ended` / `declined` / `missed` / `busy` / `failed` with accurate duration tracking.

---

## 4. Dual-Layer Notes Architecture

1. **Private Notes**:
   - Strictly isolated to the authenticated user's account (`userId` index).
   - Rich text, tags, folders, pin-to-top, archive, reminders, and file attachments.
   - Never exposed in public feeds, search queries, or user profiles.
2. **Social Notes**:
   - Ephemeral 24-hour status updates visible only to approved followers or close friends.
   - Accompanied by quick emojis and licensed music track references.
   - Allows direct message replies and likes.

---

## 5. Media Pipeline & Storage

- Configurable media storage driver: Cloudinary / S3 / Local Disk with static streaming.
- File validation: Format verification and strict size boundaries (Images: 10MB, Videos/Reels: 50MB, Audio Voice Notes: 15MB).
- Progressive video preloading and viewport-based playback cleanup for mid-range Android and iOS devices.
