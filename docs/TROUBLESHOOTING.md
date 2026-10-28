# Infernux Troubleshooting Guide

This guide covers common issues and resolutions during development, testing, and deployment.

---

## 1. WebRTC Calling & Media Connectivity

### Symptom: Voice or Video Call says "Connecting..." but fails to establish media stream
- **Cause**: Symmetric NAT on mobile cellular networks (4G/5G) preventing direct P2P connections without TURN relay.
- **Resolution**:
  1. Ensure `LIVEKIT_HOST`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` are configured with LiveKit Cloud.
  2. LiveKit Cloud provides built-in global TURN relays (TCP 443 & UDP) that bypass restrictive mobile carrier carrier-grade NATs.
  3. Ensure camera and microphone permissions have been granted in device settings.

---

## 2. Real-Time Socket.IO & Message Sync

### Symptom: Messages not arriving in real-time or socket reconnection loops
- **Resolution**:
  1. Check the server logs: verify the client is passing an active JWT access token in the `auth` handshake object.
  2. If the access token has expired (after 15 minutes), the client automatically requests `/auth/refresh-token` and reconnects the socket.
  3. On Android emulators, ensure the backend is reached via `http://10.0.2.2:4000` rather than `http://localhost:4000`.
  4. On physical devices over Wi-Fi, set `EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:4000/api/v1` in `apps/mobile/.env`.

---

## 3. Cryptographic Room Key Errors

### Symptom: "Invalid room invitation key" or "Key has expired"
- **Resolution**:
  1. Verify the format: Infernux room keys follow `IFNX-XXXX-XXXX-XXXX` (16 characters, uppercase alphanumeric excluding confusing characters like 0, O, 1, I).
  2. If the room administrator rotated the key, previous keys are automatically deactivated for security. Request the latest key from the room owner.
  3. Check if the key had a maximum usage count (`maxUses`) or time-to-live (`expiresHours`) configured.

---

## 4. Stories & Social Notes Auto-Expiration

### Symptom: Expired stories or notes still visible in feed
- **Resolution**:
  1. The server runs a background job (`startStoryCleanupJob`) every 15 minutes that flags stories older than 24 hours as `isExpired: true`.
  2. Feed queries strictly filter `{ isExpired: false, expiresAt: { $gt: new Date() } }`, ensuring expired items are never returned even between cleanup job passes.

---

## 5. Media Upload Limits

### Symptom: File upload fails with HTTP 413 or "File too large"
- **Resolution**:
  - Image files: maximum 10MB.
  - Video and Reels: maximum 50MB (max 90 seconds).
  - Audio and Voice messages: maximum 15MB.
  - Documents: maximum 25MB.

