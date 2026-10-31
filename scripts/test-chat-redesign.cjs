/**
 * Comprehensive End-to-End Test for MOZHI Chat Redesign
 * Verifies that 100% of Chat features remain functional.
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
  console.log('====================================================');
  console.log('🚀 RUNNING MOZHI CHAT REDESIGN FUNCTIONALITY TEST SUITE');
  console.log('====================================================\n');

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

    // 1. Register User A
    const userARes = await apiRequest('/auth/register', 'POST', {
      username: `chat_a_${ts}`,
      email: `chat_a_${ts}@mozhi.app`,
      displayName: 'Chat Tester A',
      password: 'Password123!',
    });
    assert(userARes.status === 201, 'Register User A (Sender)');
    const tokenA = userARes.data?.data?.tokens?.accessToken;
    const userAId = userARes.data?.data?.user?.id;

    // 2. Register User B
    const userBRes = await apiRequest('/auth/register', 'POST', {
      username: `chat_b_${ts}`,
      email: `chat_b_${ts}@mozhi.app`,
      displayName: 'Chat Tester B',
      password: 'Password123!',
    });
    assert(userBRes.status === 201, 'Register User B (Recipient)');
    const tokenB = userBRes.data?.data?.tokens?.accessToken;
    const userBId = userBRes.data?.data?.user?.id;

    // 3. Create Direct Conversation
    const convRes = await apiRequest(
      '/chats/conversations',
      'POST',
      {
        type: 'direct',
        recipientId: userBId,
      },
      tokenA
    );
    const convId = convRes.data?.data?.conversationId;
    assert(convRes.status === 201 && !!convId, 'Create Direct Conversation', `Conversation ID: ${convId}`);

    // 4. Fetch Conversations List (Chat Inbox Screen API)
    const listRes = await apiRequest('/chats/conversations', 'GET', null, tokenA);
    assert(
      listRes.status === 200 &&
        Array.isArray(listRes.data?.data) &&
        listRes.data.data.some((c) => c.id === convId),
      'Fetch Conversations List for Inbox Screen',
      `Total: ${listRes.data?.data?.length}`
    );

    // 5. Send Text Message
    const textMsgRes = await apiRequest(
      `/chats/conversations/${convId}/messages`,
      'POST',
      {
        contentType: 'text',
        content: 'Hey! Check out this Instagram-inspired chat redesign! 🔥',
      },
      tokenA
    );
    assert(textMsgRes.status === 201 && textMsgRes.data?.data?.id, 'Send Text Message in Conversation');
    const textMsgId = textMsgRes.data?.data?.id;

    // 6. Send Image Message
    const imgMsgRes = await apiRequest(
      `/chats/conversations/${convId}/messages`,
      'POST',
      {
        contentType: 'image',
        content: 'Shared photo',
        attachments: [
          {
            url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600',
            type: 'image',
          },
        ],
      },
      tokenA
    );
    assert(imgMsgRes.status === 201 && imgMsgRes.data?.data?.attachments?.length > 0, 'Send Image Attachment Message');

    // 7. Send Voice Audio Message
    const audioMsgRes = await apiRequest(
      `/chats/conversations/${convId}/messages`,
      'POST',
      {
        contentType: 'audio',
        content: 'Voice Note',
        attachments: [
          {
            url: 'https://example.com/audio.m4a',
            type: 'audio',
            duration: 8,
          },
        ],
      },
      tokenA
    );
    assert(audioMsgRes.status === 201 && audioMsgRes.data?.data?.contentType === 'audio', 'Send Voice Audio Note Message');

    // 8. Send Shared Reel Message
    const reelMsgRes = await apiRequest(
      `/chats/conversations/${convId}/messages`,
      'POST',
      {
        contentType: 'shared_reel',
        content: 'Check out this Reel!',
        metadata: {
          reelId: 'reel_12345',
          videoUrl: 'https://example.com/reel.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500',
          creatorUsername: 'viral_creator',
          caption: 'Dancing in the sunset!',
        },
      },
      tokenA
    );
    assert(reelMsgRes.status === 201 && reelMsgRes.data?.data?.contentType === 'shared_reel', 'Send Shared Reel Card Message');

    // 9. Fetch Messages List (Chat Conversation Screen API)
    const msgsRes = await apiRequest(`/chats/conversations/${convId}/messages?limit=20`, 'GET', null, tokenB);
    assert(
      msgsRes.status === 200 &&
        Array.isArray(msgsRes.data?.data?.items) &&
        msgsRes.data.data.items.length >= 4,
      'Fetch Messages List for Recipient',
      `Total Messages: ${msgsRes.data?.data?.items?.length}`
    );

    // 10. Add Emoji Reaction to Message
    const reactRes = await apiRequest(
      `/chats/messages/${textMsgId}/reactions`,
      'POST',
      { emoji: '❤️' },
      tokenB
    );
    assert(reactRes.status === 200 && reactRes.data?.success, 'Add Emoji Reaction (❤️) to Message');

    // 11. Delete Message
    const delRes = await apiRequest(`/chats/messages/${textMsgId}`, 'DELETE', null, tokenA);
    assert(delRes.status === 200 && delRes.data?.success, 'Delete Message as Sender');

    // 12. Create Private Room with Key
    const roomRes = await apiRequest(
      '/rooms',
      'POST',
      {
        name: `Redesign Secret Room ${ts.toString().slice(-4)}`,
        description: 'End-to-end room verification',
        isPrivate: true,
      },
      tokenA
    );
    const secretKey = roomRes.data?.data?.room?.currentKey?.secretKey;
    assert(roomRes.status === 201 && !!secretKey, 'Create Private Room with Secret Key', `Key: ${secretKey}`);

    // 13. Fetch Call History (Calls Tab API)
    const callsRes = await apiRequest('/calls/history?limit=30', 'GET', null, tokenA);
    assert(callsRes.status === 200 && Array.isArray(callsRes.data?.data), 'Fetch Call Log History for Calls Tab');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed === 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
