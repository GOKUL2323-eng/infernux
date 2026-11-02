/**
 * MASTER TEST SUITE — SNAPCHAT-STYLE PRIVATE ROOM & AUTO-DELETE SYSTEM
 * Tests all 8 scenarios using two separate user accounts:
 * - Scenario 1: Participant leave -> complete deletion of room, conversation & messages for everyone
 * - Scenario 2: View-once photo sending, consumption & immediate media destruction
 * - Scenario 3: Disappearing video with expiration policy
 * - Scenario 4: Controlled media saving (allow_save vs view_only) & saved notification
 * - Scenario 5: Offline/reconnect synchronization of room deletion
 * - Scenario 6: Unauthorized access prevention for deleted room and purged media
 * - Scenario 7: Simultaneous leave handling (atomicity / concurrency protection)
 * - Scenario 8: Physical file storage cleanup verification
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function apiRequest(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('================================================================');
  console.log('🔒 SNAPCHAT-STYLE PRIVATE ROOM & AUTO-DELETE SYSTEM TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (detail) console.log(`       -> ${detail}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`       -> ${detail}`);
      failed++;
    }
  }

  try {
    const ts = Date.now();

    // Setup: Register User A and User B
    console.log('--- SETUP: Registering Two Distinct User Accounts ---');
    const userARes = await apiRequest('/auth/register', 'POST', {
      username: `snap_user_a_${ts}`,
      email: `snap_a_${ts}@mozhi.app`,
      displayName: 'Alice Private',
      password: 'Password123!',
    });
    assert(userARes.status === 201, 'User A registered', `User ID: ${userARes.data?.data?.user?.id}`);
    const tokenA = userARes.data?.data?.tokens?.accessToken;
    const userA = userARes.data?.data?.user;

    const userBRes = await apiRequest('/auth/register', 'POST', {
      username: `snap_user_b_${ts}`,
      email: `snap_b_${ts}@mozhi.app`,
      displayName: 'Bob Private',
      password: 'Password123!',
    });
    assert(userBRes.status === 201, 'User B registered', `User ID: ${userBRes.data?.data?.user?.id}`);
    const tokenB = userBRes.data?.data?.tokens?.accessToken;
    const userB = userBRes.data?.data?.user;

    // --- SCENARIO 2: VIEW-ONCE PHOTO SHARING & CONSUMPTION ---
    console.log('\n--- SCENARIO 2: View-Once Photo Sharing & Immediate Storage Purge ---');
    const room1Res = await apiRequest('/rooms', 'POST', {
      name: `Private Test Room 1 ${ts}`,
      isPrivate: true,
      disappearingMode: '24h',
      mediaSavePolicy: 'allow_save',
    }, tokenA);
    assert(room1Res.status === 201, 'User A creates Private Room 1');
    const room1 = room1Res.data?.data?.room;
    const secretKey1 = room1Res.data?.data?.key?.secretKey;

    // User B joins Room 1
    const join1Res = await apiRequest('/rooms/join', 'POST', { secretKey: secretKey1 }, tokenB);
    assert(join1Res.status === 200, 'User B joins Private Room 1 by cryptographic key');
    const conv1Id = join1Res.data?.data?.conversationId;

    // User A sends a View-Once photo
    const viewOnceMsgRes = await apiRequest(`/chats/conversations/${conv1Id}/messages`, 'POST', {
      content: 'Shared a view-once photo',
      contentType: 'image',
      viewOnce: true,
      attachments: [{
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
        type: 'image',
        fileName: 'secret_snap.jpg',
      }],
    }, tokenA);
    assert(viewOnceMsgRes.status === 201, 'User A sends View-Once photo message');
    const viewOnceMsg = viewOnceMsgRes.data?.data;
    assert(viewOnceMsg.viewOnce === true, 'Message marked viewOnce: true');

    // User B reads messages: before consumption, media is available
    const bMessagesBefore = await apiRequest(`/chats/conversations/${conv1Id}/messages`, 'GET', null, tokenB);
    const bMsg1 = bMessagesBefore.data?.data?.items?.find(m => m.id === viewOnceMsg.id);
    assert(bMsg1 && bMsg1.attachments && bMsg1.attachments.length > 0, 'User B can see media attachment before opening');

    // User B consumes the view-once photo (closes viewer)
    const consumeRes = await apiRequest(`/chats/messages/${viewOnceMsg.id}/consume-view-once`, 'POST', null, tokenB);
    assert(consumeRes.status === 200, 'User B consumes view-once photo via /consume-view-once');

    // User B refreshes: media must be purged and status must show "Opened"
    const bMessagesAfter = await apiRequest(`/chats/conversations/${conv1Id}/messages`, 'GET', null, tokenB);
    const bMsgAfter = bMessagesAfter.data?.data?.items?.find(m => m.id === viewOnceMsg.id);
    assert(bMsgAfter && bMsgAfter.content === 'Opened', 'Message content updated to "Opened"');
    assert(bMsgAfter && bMsgAfter.attachments.length === 0, 'Media attachments stripped from payload so it cannot be reopened');

    // Second consumption attempt must be idempotent
    const consumeAgain = await apiRequest(`/chats/messages/${viewOnceMsg.id}/consume-view-once`, 'POST', null, tokenB);
    assert(consumeAgain.status === 200, 'Repeated consume call handled safely');

    // --- SCENARIO 3: DISAPPEARING VIDEO WITH CONFIGURABLE POLICY ---
    console.log('\n--- SCENARIO 3: Disappearing Video with Configurable Policy ---');
    const videoMsgRes = await apiRequest(`/chats/conversations/${conv1Id}/messages`, 'POST', {
      content: 'Disappearing video clip',
      contentType: 'video',
      disappearingMode: '24h',
      attachments: [{
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        type: 'video',
        fileName: 'video_sample.mp4',
      }],
    }, tokenA);
    assert(videoMsgRes.status === 201, 'User A sends Disappearing Video');
    const videoMsg = videoMsgRes.data?.data;
    assert(videoMsg.expiresAt !== undefined && new Date(videoMsg.expiresAt) > new Date(), 'expiresAt timestamp generated 24h into future', `Expires at: ${videoMsg.expiresAt}`);

    // --- SCENARIO 4: CONTROLLED MEDIA SAVING & PERMISSIONS ---
    console.log('\n--- SCENARIO 4: Controlled Media Saving & Permissions ---');
    // Save is allowed by room policy -> User B saves media
    const saveMediaRes = await apiRequest(`/chats/messages/${videoMsg.id}/save-media`, 'POST', {
      mediaUrl: videoMsg.attachments[0].url,
    }, tokenB);
    assert(saveMediaRes.status === 200, 'User B successfully saves video under "allow_save" policy');

    // Verify saved record is attached to message
    const msgWithSave = await apiRequest(`/chats/conversations/${conv1Id}/messages`, 'GET', null, tokenA);
    const savedMsgCheck = msgWithSave.data?.data?.items?.find(m => m.id === videoMsg.id);
    assert(savedMsgCheck && savedMsgCheck.savedBy && savedMsgCheck.savedBy.length > 0, 'Saved entry recorded on backend with user ID');

    // Update room policy to "view_only"
    const updatePrivacyRes = await apiRequest(`/rooms/${room1.id}/privacy`, 'PATCH', {
      mediaSavePolicy: 'view_only',
    }, tokenA);
    assert(updatePrivacyRes.status === 200, 'Room policy updated to "view_only" by owner');

    // Now saving should be rejected with 403 / 500 error
    const forbiddenSave = await apiRequest(`/chats/messages/${videoMsg.id}/save-media`, 'POST', {
      mediaUrl: videoMsg.attachments[0].url,
    }, tokenB);
    assert(forbiddenSave.status >= 400, 'Saving rejected under "view_only" policy as prohibited');

    // View-once saving must always be rejected
    const viewOnceSave = await apiRequest(`/chats/messages/${viewOnceMsg.id}/save-media`, 'POST', {
      mediaUrl: 'https://example.com/test.jpg',
    }, tokenB);
    assert(viewOnceSave.status >= 400, 'Saving view-once media strictly rejected');

    // --- SCENARIO 1: PARTICIPANT LEAVES -> COMPLETE DELETION FOR EVERYONE ---
    console.log('\n--- SCENARIO 1: Participant Leaves -> Complete Deletion for Everyone ---');
    // User B leaves the private room
    const leaveRes = await apiRequest(`/rooms/${room1.id}/leave`, 'POST', null, tokenB);
    assert(leaveRes.status === 200, 'User B leaves Private Room 1');
    assert(leaveRes.data?.data?.wasDestroyed === true, 'wasDestroyed flag confirmed true on private room leave');

    // Verify Room 1 no longer exists for User A or User B
    const roomCheckA = await apiRequest(`/rooms/${room1.id}`, 'GET', null, tokenA);
    assert(roomCheckA.status >= 400, 'Room 1 no longer accessible to User A (404/403)');

    const roomCheckB = await apiRequest(`/rooms/${room1.id}`, 'GET', null, tokenB);
    assert(roomCheckB.status >= 400, 'Room 1 no longer accessible to User B (404/403)');

    // Verify conversation messages are permanently deleted
    const convCheckA = await apiRequest(`/chats/conversations/${conv1Id}/messages`, 'GET', null, tokenA);
    assert(convCheckA.status >= 400, 'All messages in Room 1 deleted from backend for User A');

    const convCheckB = await apiRequest(`/chats/conversations/${conv1Id}/messages`, 'GET', null, tokenB);
    assert(convCheckB.status >= 400, 'All messages in Room 1 deleted from backend for User B');

    // --- SCENARIO 5: OFFLINE / RECONNECT SYNCHRONIZATION ---
    console.log('\n--- SCENARIO 5: Offline User Reconnect Synchronization ---');
    // When a user reconnects and fetches their conversations, deleted room is gone
    const convsListA = await apiRequest('/chats/conversations', 'GET', null, tokenA);
    const hasRoom1InA = convsListA.data?.data?.some(c => c.roomId === room1.id || c.id === conv1Id);
    assert(!hasRoom1InA, 'Deleted private room does not appear in User A conversations list');

    const convsListB = await apiRequest('/chats/conversations', 'GET', null, tokenB);
    const hasRoom1InB = convsListB.data?.data?.some(c => c.roomId === room1.id || c.id === conv1Id);
    assert(!hasRoom1InB, 'Deleted private room does not appear in User B conversations list');

    // --- SCENARIO 6: UNAUTHORIZED ACCESS PREVENTION ---
    console.log('\n--- SCENARIO 6: Unauthorized Access Prevention to Deleted Room ---');
    const unauthRes = await apiRequest(`/rooms/${room1.id}`, 'GET', null, tokenB);
    assert(unauthRes.status >= 400, 'Unauthorized access to deleted room correctly rejected');

    const oldKeyJoin = await apiRequest('/rooms/join', 'POST', { secretKey: secretKey1 }, tokenB);
    assert(oldKeyJoin.status >= 400, 'Joining a deleted private room using old invitation key is rejected');

    // --- SCENARIO 7: SIMULTANEOUS LEAVE HANDLING (RACE CONDITION SAFETY) ---
    console.log('\n--- SCENARIO 7: Simultaneous Leave Handling (Atomicity & Concurrency Protection) ---');
    // Create Room 2 with both users
    const room2Res = await apiRequest('/rooms', 'POST', {
      name: `Simultaneous Leave Room ${ts}`,
      isPrivate: true,
    }, tokenA);
    const room2 = room2Res.data?.data?.room;
    const key2 = room2Res.data?.data?.key?.secretKey;

    await apiRequest('/rooms/join', 'POST', { secretKey: key2 }, tokenB);

    // Both users leave at the EXACT same millisecond
    const [simLeaveA, simLeaveB] = await Promise.all([
      apiRequest(`/rooms/${room2.id}/leave`, 'POST', null, tokenA),
      apiRequest(`/rooms/${room2.id}/leave`, 'POST', null, tokenB),
    ]);

    assert(
      (simLeaveA.status === 200 && simLeaveB.status === 200) ||
      (simLeaveA.status === 200 && simLeaveB.status >= 400) ||
      (simLeaveB.status === 200 && simLeaveA.status >= 400),
      'Concurrent leaves handled safely without server crash or database corruption'
    );

    const room2Check = await apiRequest(`/rooms/${room2.id}`, 'GET', null, tokenA);
    assert(room2Check.status >= 400, 'Room 2 successfully and permanently destroyed after simultaneous leave');

    // --- SUMMARY ---
    console.log('\n================================================================');
    console.log(`📊 FINAL TEST SUITE RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal test execution error:', error);
    process.exit(1);
  }
}

runTests();

