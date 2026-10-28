# Infernux Testing Guide

This guide details automated and multi-device manual testing procedures for Infernux.

---

## 1. Automated Testing Execution

Infernux includes unit and API integration tests covering cryptographic utilities, domain schemas, API error envelopes, health endpoints, and token generation.

### Run All Monorepo Tests:
```bash
npm test
```

### Run Server Tests Individually:
```bash
npm run test --workspace=apps/server
```

### Run Monorepo Type Check:
```bash
npm run typecheck
```

---

## 2. Multi-Device End-to-End Verification Walkthrough

To verify real-time messaging, room keys, and voice/video calling across physical devices or emulators, prepare two accounts (e.g. Account A and Account B).

### Test Case 1: Cryptographic Room Key Creation & Joining
1. On **Device A**:
   - Log in as User A (`alex`).
   - Navigate to the **Chats** tab -> **Rooms & Keys** sub-tab.
   - Tap **Create Room**. Name it `"Alpha Squad"`.
   - Verify the generated key matches the format `IFNX-XXXX-XXXX-XXXX`.
   - Tap **Copy Key**.
2. On **Device B**:
   - Log in as User B (`morgan`).
   - Navigate to the **Chats** tab -> Tap **Join via Key** (or the key icon in header).
   - Paste the copied key `IFNX-XXXX-XXXX-XXXX` and tap **Verify & Join Room**.
   - Verify Device B is immediately admitted to the room conversation.
   - Send a message from Device B; verify it arrives instantly on Device A via WebSocket.

### Test Case 2: WebRTC Voice & Video Call
1. From Device A in the direct chat with User B, tap the **Phone** or **Video** icon in the header.
2. Device A status indicates: `"Ringing..."`.
3. Device B immediately receives the incoming call modal with caller avatar and Accept/Decline buttons.
4. Tap **Accept** on Device B:
   - Call status switches to `"Connected"`.
   - Duration timer begins incrementing on both screens.
   - Test Mute/Unmute, Video on/off, and Camera Flip controls.
5. Tap the red **End Call** button on either device:
   - Call terminates on both devices.
   - The call record with duration appears in the **Calls** tab history.

### Test Case 3: Instagram-style Reels & Stories
1. On Device A, tap the center **Create** tab -> select **Reel** or **Story**.
2. Pick a video or photo, enter a caption, and tap **Publish**.
3. On Device B:
   - Switch to the **Home** tab: User A's avatar appears in the top Stories tray with a crimson neon gradient ring. Tap it to view the 24-hour Story.
   - Switch to the **Reels** tab: Swipe vertically through reels, tap heart to like, and observe real-time count increments.

### Test Case 4: Private Notes Vault vs Social Notes
1. On Device A, tap Profile -> tap the **Private Notes Vault** icon.
2. Create an encrypted note with `#tags`. Verify it appears in your personal vault.
3. Switch to Device B: verify User A's private note is **not** visible anywhere on Device B.
4. On Device A, go to Create -> **Social Note** -> type a status with a fire emoji and share.
5. On Device B, open Social Notes: the 24-hour ephemeral status is visible to followers with like and reply options.

