# Infernux REST API & Socket.IO Specification

Base URL: `http://localhost:4000/api/v1` (or your configured production domain)

All responses follow the unified envelope:
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | NOT_FOUND | RATE_LIMIT_EXCEEDED",
    "message": "Human-readable error description",
    "details": []
  }
}
```

---

## 1. Authentication Endpoints

### `POST /auth/register`
Creates a new user account.
- **Body**: `{ username, email, password, displayName, phoneNumber? }`
- **Response**: `{ user: UserProfile, tokens: { accessToken, refreshToken, expiresIn } }`

### `POST /auth/login`
Authenticates with username or email and password.
- **Body**: `{ loginIdentifier, password, deviceId? }`
- **Response**: `{ user: UserProfile, tokens: { accessToken, refreshToken, expiresIn } }`

### `POST /auth/refresh-token`
Rotates the session refresh token and returns a new token pair.
- **Body**: `{ refreshToken }`
- **Response**: `{ accessToken, refreshToken, expiresIn }`

### `POST /auth/logout`
Revokes the refresh token session.
- **Headers**: `Authorization: Bearer <accessToken>`
- **Body**: `{ refreshToken? }`

### `GET /auth/me`
Retrieves the authenticated user's profile and privacy configuration.

### `DELETE /auth/account`
Permanently deletes user data, sessions, and associated follow records.

---

## 2. Protected Rooms & Room Keys

### `POST /rooms`
Creates a private room and generates a cryptographically secure invitation key.
- **Headers**: `Authorization: Bearer <accessToken>`
- **Body**: `{ name, description?, isPrivate?, keyExpiresHours?, maxUses? }`
- **Response**:
```json
{
  "room": {
    "id": "67...",
    "name": "VIP Alpha Lounge",
    "ownerId": "...",
    "memberCount": 1
  },
  "key": {
    "keyId": "...",
    "secretKey": "IFNX-XXXX-XXXX-XXXX",
    "inviteUrl": "https://infernux.app/join?key=IFNX-XXXX-XXXX-XXXX",
    "expiresAt": null,
    "maxUses": null
  }
}
```

### `POST /rooms/join`
Joins a room by verifying its secret cryptographic invitation key.
- **Body**: `{ secretKey: "IFNX-XXXX-XXXX-XXXX" }`

### `POST /rooms/:id/rotate-key`
Revokes existing room keys and generates a new key (Owners & Admins only).
- **Body**: `{ expiresHours?, maxUses? }`

### `GET /rooms/:id`
Retrieves room details (Requires active room membership).

### `GET /rooms/:id/members`
Lists all room members and roles (`owner`, `admin`, `moderator`, `member`).

### `DELETE /rooms/:id/members/:userId`
Removes a member from the room.

### `POST /rooms/:id/leave`
Leaves the room.

---

## 3. Real-Time Chat & Messaging

### `GET /chats/conversations`
Returns all direct, group, and room conversations for the authenticated user with unread counts and last message previews.

### `GET /chats/conversations/:id/messages?limit=30&beforeCursor=...`
Cursor-paginated message history. Verifies participant authorization.

### `POST /chats/conversations/:id/messages`
Sends a message (text, image, video, audio, shared post/reel).
- **Body**:
```json
{
  "content": "Message body",
  "contentType": "text" | "image" | "video" | "audio",
  "attachments": [{ "url": "...", "type": "image" }],
  "replyToId": "..."
}
```

### `POST /chats/conversations/:id/read`
Marks all incoming messages in the conversation as read and broadcasts read receipts.

---

## 4. WebRTC Voice & Video Calling

### `POST /calls/initiate`
Initiates a voice or video call, registers the session, and generates a LiveKit caller token.
- **Body**: `{ callType: "voice" | "video", recipientId?, roomId? }`
- **Response**: `CallSession` with `livekitToken` and `channelName`.

### `GET /calls/:id/token`
Generates a LiveKit JWT token for an authorized participant joining an active call.

### `POST /calls/:id/respond`
Responds to an incoming call.
- **Body**: `{ action: "accept" | "reject" | "busy" }`

### `POST /calls/:id/end`
Ends the call and persists the total call duration.
- **Body**: `{ durationSeconds?: number }`

### `GET /calls/history`
Returns recent incoming and outgoing voice/video call history.

---

## 5. Social Posts, Reels & Stories

- `GET /posts/feed`: Paginated home post feed (chronological or personalized).
- `POST /posts`: Publishes image/video post with caption and hashtags.
- `POST /posts/:id/like`: Likes/unlikes post.
- `POST /posts/:id/save`: Bookmarks post.
- `GET /reels/feed`: Paginated vertical short-video feed.
- `POST /reels`: Publishes short video reel.
- `POST /reels/:id/view`: Records view metric.
- `GET /stories/feed`: 24-hour stories feed grouped by creator.
- `POST /stories`: Posts image or video story with 24-hour expiration.

---

## 6. Music & Notes

- `GET /music/catalog`: Curated audio catalog.
- `GET /music/search?q=...`: Search songs and artists.
- `GET /notes/private`: User's encrypted private notes vault.
- `POST /notes/private`: Creates a private note with tags and pinning.
- `GET /notes/social/feed`: Ephemeral 24-hour social notes from friends.
- `POST /notes/social`: Publishes social note with emoji and music track reference.

---

## 7. Socket.IO Events Reference

| Event Name | Direction | Payload |
|---|---|---|
| `presence:status_change` | Server -> Client | `{ userId, isOnline, lastSeen }` |
| `chat:join` | Client -> Server | `conversationId` |
| `chat:leave` | Client -> Server | `conversationId` |
| `chat:send_message` | Client -> Server | `SendMessageInput` |
| `chat:new_message` | Server -> Client | `MessageSummary` |
| `chat:typing_start` | Client -> Server | `{ conversationId }` |
| `chat:typing_stop` | Client -> Server | `{ conversationId }` |
| `chat:user_typing` | Server -> Client | `{ conversationId, userId, isTyping }` |
| `chat:read_receipt` | Client -> Server | `{ conversationId }` |
| `chat:receipt_updated` | Server -> Client | `{ conversationId, userId, status }` |
| `call:initiate` | Client -> Server | `{ recipientId, roomId, call }` |
| `call:incoming` | Server -> Client | `CallInvitationPayload` |
| `call:accepted` | Server -> Client | `{ callerId, callId }` |
| `call:rejected` | Server -> Client | `{ callerId, callId, reason }` |
| `call:ended` | Server -> Client | `{ targetUserId, callId }` |
