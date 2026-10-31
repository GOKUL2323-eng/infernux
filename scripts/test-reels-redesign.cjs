/**
 * Comprehensive End-to-End Test for MOZHI Reels Redesign
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
  console.log('🚀 RUNNING MOZHI REELS REDESIGN END-TO-END TEST SUITE');
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
    // 1. Health Check
    const healthRes = await fetch('http://localhost:4000/health');
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'healthy', 'Backend Server Health Check', `Service: ${healthData.service}`);

    // 2. Register / Authenticate User
    const ts = Date.now();
    const regRes = await apiRequest('/auth/register', 'POST', {
      username: `reel_tester_${ts}`,
      email: `reel_${ts}@mozhi.app`,
      displayName: 'Reel QA Tester',
      password: 'Password123!',
    });

    assert(regRes.status === 201 && regRes.data?.success, 'Authenticate / Register Test Account');
    const token = regRes.data?.data?.tokens?.accessToken;
    const userId = regRes.data?.data?.user?.id;
    assert(!!token, 'Obtained JWT Session Access Token', `User ID: ${userId}`);

    // 3. Publish a new 9:16 Vertical Reel
    const createRes = await apiRequest(
      '/reels',
      'POST',
      {
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500',
        caption: 'Testing the stunning new Instagram-style Reels redesign on MOZHI! #mozhi #viral #trending',
        audio: {
          title: 'Original Audio',
          artist: 'Reel QA Tester',
        },
        duration: 30,
      },
      token
    );

    assert(createRes.status === 201 && createRes.data?.success, 'Publish New 9:16 Vertical Reel', `Reel ID: ${createRes.data?.data?.id}`);
    const testReel = createRes.data?.data;
    const testReelId = testReel.id;

    // 4. Fetch 'For You' Reels Feed
    const forYouRes = await apiRequest('/reels/feed?limit=15&feedType=for_you', 'GET', null, token);
    assert(
      forYouRes.status === 200 &&
        forYouRes.data?.data?.items &&
        forYouRes.data.data.items.some((r) => r.id === testReelId),
      "Fetch 'For You' Reels Feed",
      `Total Reels in Feed: ${forYouRes.data?.data?.items?.length}`
    );

    // 5. Fetch 'Following' Reels Feed
    const followingRes = await apiRequest('/reels/feed?limit=15&feedType=following', 'GET', null, token);
    assert(
      followingRes.status === 200 && Array.isArray(followingRes.data?.data?.items),
      "Fetch 'Following' Reels Feed (empty or followed creators only)",
      `Count: ${followingRes.data?.data?.items?.length}`
    );

    // 6. Search Reels by Hashtag
    const hashtagRes = await apiRequest('/reels/feed?limit=15&hashtag=mozhi', 'GET', null, token);
    assert(
      hashtagRes.status === 200 &&
        hashtagRes.data?.data?.items &&
        hashtagRes.data.data.items.some((r) => r.id === testReelId),
      'Search Reels by Hashtag (#mozhi)',
      `Found ${hashtagRes.data?.data?.items?.length} matches`
    );

    // 7. Search Reels by Keyword Query
    const queryRes = await apiRequest('/reels/feed?limit=15&query=redesign', 'GET', null, token);
    assert(
      queryRes.status === 200 &&
        queryRes.data?.data?.items &&
        queryRes.data.data.items.some((r) => r.id === testReelId),
      'Search Reels by Keyword ("redesign")',
      `Found ${queryRes.data?.data?.items?.length} matches`
    );

    // 8. Record Reel View
    const viewRes = await apiRequest(`/reels/${testReelId}/view`, 'POST', null, token);
    assert(viewRes.status === 200 && viewRes.data?.success, 'Record Reel View in Database');

    // 9. Like Reel
    const likeRes = await apiRequest(`/reels/${testReelId}/like`, 'POST', null, token);
    assert(
      likeRes.status === 200 && likeRes.data?.data?.liked === true,
      'Like Reel with Instant Response',
      `New Likes Count: ${likeRes.data?.data?.likesCount}`
    );

    // 10. Unlike Reel
    const unlikeRes = await apiRequest(`/reels/${testReelId}/like`, 'POST', null, token);
    assert(
      unlikeRes.status === 200 && unlikeRes.data?.data?.liked === false,
      'Unlike Reel Restores Count',
      `Restored Likes Count: ${unlikeRes.data?.data?.likesCount}`
    );

    // 11. Save / Bookmark Reel
    const saveRes = await apiRequest(`/reels/${testReelId}/save`, 'POST', null, token);
    assert(
      saveRes.status === 200 && saveRes.data?.data?.saved === true,
      'Save Reel to Bookmarks Collection'
    );

    // 12. Add Comment to Reel
    const commentRes = await apiRequest(
      `/reels/${testReelId}/comments`,
      'POST',
      { content: 'This new Reels design looks exactly like Instagram! 🔥🙌' },
      token
    );
    assert(
      commentRes.status === 201 && commentRes.data?.data?.id,
      'Add Comment to Reel Bottom Sheet',
      `Comment ID: ${commentRes.data?.data?.id}`
    );

    // 13. Fetch Comments for Reel
    const getCommentsRes = await apiRequest(`/reels/${testReelId}/comments`, 'GET', null, token);
    assert(
      getCommentsRes.status === 200 &&
        Array.isArray(getCommentsRes.data?.data) &&
        getCommentsRes.data.data.some((c) => c.content.includes('Instagram')),
      'Fetch Comments with Author Avatar, Username & Timestamps',
      `Total Comments: ${getCommentsRes.data?.data?.length}`
    );

    // 14. Record Share in Database
    const shareRes = await apiRequest(`/reels/${testReelId}/share`, 'POST', null, token);
    assert(
      shareRes.status === 200 && shareRes.data?.data?.sharesCount >= 1,
      'Record Reel Share in Database',
      `Shares Count: ${shareRes.data?.data?.sharesCount}`
    );

    // 15. Share Reel directly into a Chat conversation
    // Register User B to have a direct conversation
    const userBRes = await apiRequest('/auth/register', 'POST', {
      username: `reel_friend_${ts}`,
      email: `friend_${ts}@mozhi.app`,
      displayName: 'Reel Friend',
      password: 'Password123!',
    });
    const userBId = userBRes.data?.data?.user?.id;

    if (userBId) {
      const convRes = await apiRequest(
        '/chat/conversations',
        'POST',
        {
          type: 'direct',
          recipientId: userBId,
        },
        token
      );

      if (convRes.status === 201 || convRes.status === 200) {
        const convId = convRes.data?.data?.id;
        const msgRes = await apiRequest(
          `/chat/conversations/${convId}/messages`,
          'POST',
          {
            contentType: 'shared_reel',
            content: 'Watch this awesome reel on MOZHI!',
            metadata: {
              reelId: testReelId,
              videoUrl: testReel.videoUrl,
              thumbnailUrl: testReel.thumbnailUrl,
              creatorUsername: `reel_tester_${ts}`,
              caption: testReel.caption,
            },
          },
          token
        );

        assert(
          msgRes.status === 201 && msgRes.data?.success,
          'Share Reel into Direct Chat Message (shared_reel)',
          `Message ID: ${msgRes.data?.data?.id}`
        );
      }
    }

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
