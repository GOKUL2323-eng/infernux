/**
 * Comprehensive System Functionality Audit Script
 * Tests all core modules end-to-end against the live backend API.
 */
const http = require('http');

const BASE_URL = 'http://localhost:4000/api/v1';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

const results = [];

function record(module, testName, passed, details = '') {
  results.push({ module, testName, status: passed ? 'PASS' : 'FAIL', details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] [${module}] ${testName} ${details ? '(' + details + ')' : ''}`);
}

async function runAudit() {
  console.log('=== STARTING FULL APPLICATION AUDIT ===\n');

  const uniqueId = Date.now().toString().slice(-6);
  let userAToken = null;
  let userAId = null;
  let userBToken = null;
  let userBId = null;

  // 1. AUTHENTICATION MODULE
  try {
    const regRes = await request('POST', '/auth/register', {
      username: `audita_${uniqueId}`,
      email: `audita_${uniqueId}@mozhi.app`,
      password: 'AuditPassword123!',
      displayName: `Audit User A ${uniqueId}`,
    });
    const regPass = regRes.status === 201 && regRes.body?.success;
    record('Authentication', 'User Registration (User A)', regPass, `status: ${regRes.status}`);
    if (regPass) {
      userAToken = regRes.body.data.tokens.accessToken;
      userAId = regRes.body.data.user.id;
    }

    const loginRes = await request('POST', '/auth/login', {
      loginIdentifier: `audita_${uniqueId}`,
      password: 'AuditPassword123!',
    });
    record('Authentication', 'Password Login', loginRes.status === 200 && loginRes.body?.success);

    // Register User B for two-party testing
    const regB = await request('POST', '/auth/register', {
      username: `auditb_${uniqueId}`,
      email: `auditb_${uniqueId}@mozhi.app`,
      password: 'AuditPassword123!',
      displayName: `Audit User B ${uniqueId}`,
    });
    if (regB.status === 201 && regB.body?.success) {
      userBToken = regB.body.data.tokens.accessToken;
      userBId = regB.body.data.user.id;
    }
    record('Authentication', 'User Registration (User B)', !!userBToken);

    // Phone OTP Flow
    const testPhone = `98${uniqueId.padStart(8, '1')}`;
    const otpRes = await request('POST', '/auth/phone/send-otp', {
      phoneNumber: testPhone,
      countryCode: '+91',
      purpose: 'login',
    });
    record('Authentication', 'Send Phone OTP', otpRes.status === 200 && otpRes.body?.success);

    const badOtp = await request('POST', '/auth/phone/login', {
      phoneNumber: testPhone,
      countryCode: '+91',
      otp: '000000',
    });
    record('Authentication', 'Reject Invalid OTP', badOtp.status !== 200 && !badOtp.body?.success);

    const goodOtp = await request('POST', '/auth/phone/login', {
      phoneNumber: testPhone,
      countryCode: '+91',
      otp: '999999', // test bypass code
    });
    record('Authentication', 'Verify Valid OTP & Login', goodOtp.status === 200 && goodOtp.body?.success);

    const meRes = await request('GET', '/auth/me', null, userAToken);
    record('Authentication', 'Session Persistence (GET /auth/me)', meRes.status === 200 && meRes.body?.data?.id === userAId);
  } catch (err) {
    record('Authentication', 'Auth Flow Exception', false, err.message);
  }

  // 2. SOCIAL & PROFILE MODULE
  try {
    const profRes = await request('PATCH', '/users/profile', {
      bio: 'Audited Lead Engineer account',
      displayName: 'Audited Lead',
    }, userAToken);
    record('Profile', 'Update Profile Bio & Name', profRes.status === 200 && profRes.body?.success);

    const followRes = await request('POST', `/users/${userBId}/follow`, null, userAToken);
    record('Profile', 'Follow User (User A -> User B)', followRes.status === 200 && followRes.body?.success);

    const followList = await request('GET', `/users/${userBId}/followers`, null, userAToken);
    record('Profile', 'Get Followers List', followList.status === 200 && followList.body?.success);

    const unfollowRes = await request('DELETE', `/users/${userBId}/unfollow`, null, userAToken);
    record('Profile', 'Unfollow User', unfollowRes.status === 200 && unfollowRes.body?.success);
  } catch (err) {
    record('Profile', 'Profile & Follow Exception', false, err.message);
  }

  // 3. POSTS MODULE
  let createdPostId = null;
  try {
    const createPost = await request('POST', '/posts', {
      caption: 'This is an automated QA test post for the complete system audit.',
      media: [{
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800',
        type: 'image',
      }],
      isPrivate: false,
    }, userAToken);
    const postPass = createPost.status === 201 && createPost.body?.success;
    record('Posts', 'Create Post with Media', postPass, postPass ? '' : JSON.stringify(createPost.body));
    if (postPass) {
      createdPostId = createPost.body.data.id;
    }

    const feedRes = await request('GET', '/posts/feed', null, userAToken);
    const feedPass = feedRes.status === 200 && feedRes.body?.success && (Array.isArray(feedRes.body.data) || Array.isArray(feedRes.body.data?.items));
    record('Posts', 'Get Home Feed', feedPass);

    if (createdPostId) {
      const likePost = await request('POST', `/posts/${createdPostId}/like`, null, userBToken);
      record('Posts', 'Like Post (User B)', likePost.status === 200 && likePost.body?.success);

      const commentPost = await request('POST', `/posts/${createdPostId}/comments`, {
        content: 'Great post from automated audit!',
      }, userBToken);
      record('Posts', 'Comment on Post', commentPost.status === 201 && commentPost.body?.success);

      const getComments = await request('GET', `/posts/${createdPostId}/comments`, null, userAToken);
      record('Posts', 'Get Post Comments', getComments.status === 200 && (Array.isArray(getComments.body?.data) || Array.isArray(getComments.body?.data?.items)));

      const savePost = await request('POST', `/posts/${createdPostId}/save`, null, userAToken);
      record('Posts', 'Bookmark / Save Post', savePost.status === 200 && savePost.body?.success);

      const delPost = await request('DELETE', `/posts/${createdPostId}`, null, userAToken);
      record('Posts', 'Delete Post', delPost.status === 200 && delPost.body?.success);
    }
  } catch (err) {
    record('Posts', 'Posts Exception', false, err.message);
  }

  // 4. REELS MODULE
  let createdReelId = null;
  try {
    const reelFeed = await request('GET', '/reels/feed', null, userAToken);
    record('Reels', 'Fetch Reels Feed', reelFeed.status === 200 && reelFeed.body?.success);

    const createReel = await request('POST', '/reels', {
      videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800',
      caption: 'Automated QA Reel #audit #vibes',
      duration: 52,
      hashtags: ['audit', 'vibes'],
    }, userAToken);
    const reelPass = createReel.status === 201 && createReel.body?.success;
    record('Reels', 'Create / Publish Reel', reelPass);
    if (reelPass) {
      createdReelId = createReel.body.data.id;
    }

    if (createdReelId) {
      const viewReel = await request('POST', `/reels/${createdReelId}/view`, null, userAToken);
      record('Reels', 'Record Reel View', viewReel.status === 200 && viewReel.body?.success);

      const likeReel = await request('POST', `/reels/${createdReelId}/like`, null, userBToken);
      record('Reels', 'Like Reel (User B)', likeReel.status === 200 && likeReel.body?.success);

      const commentReel = await request('POST', `/reels/${createdReelId}/comments`, {
        content: 'Awesome reel playback from audit!',
      }, userBToken);
      record('Reels', 'Add Comment to Reel', commentReel.status === 201 && commentReel.body?.success);

      const getReelComments = await request('GET', `/reels/${createdReelId}/comments`, null, userAToken);
      record('Reels', 'Fetch Reel Comments', getReelComments.status === 200 && Array.isArray(getReelComments.body?.data));

      const shareReel = await request('POST', `/reels/${createdReelId}/share`, null, userAToken);
      record('Reels', 'Share Reel', shareReel.status === 200 && shareReel.body?.success);

      const saveReel = await request('POST', `/reels/${createdReelId}/save`, null, userAToken);
      record('Reels', 'Save Reel Bookmark', saveReel.status === 200 && saveReel.body?.success);
    }
  } catch (err) {
    record('Reels', 'Reels Exception', false, err.message);
  }

  // 5. STORIES MODULE
  let createdStoryId = null;
  try {
    const createStory = await request('POST', '/stories', {
      mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      mediaType: 'image',
      caption: 'QA story audit',
      duration: 5,
    }, userAToken);
    const storyPass = createStory.status === 201 && createStory.body?.success;
    record('Stories', 'Create Story', storyPass, storyPass ? '' : JSON.stringify(createStory.body));
    if (storyPass) {
      createdStoryId = createStory.body.data.id;
    }

    const storyFeed = await request('GET', '/stories/feed', null, userAToken);
    record('Stories', 'Get Stories Feed', storyFeed.status === 200 && storyFeed.body?.success);

    if (createdStoryId) {
      const viewStory = await request('POST', `/stories/${createdStoryId}/view`, null, userBToken);
      record('Stories', 'Record Story View (User B)', viewStory.status === 200 && viewStory.body?.success);

      const getViewers = await request('GET', `/stories/${createdStoryId}/viewers`, null, userAToken);
      record('Stories', 'Get Story Viewers List', getViewers.status === 200 && Array.isArray(getViewers.body?.data));

      const delStory = await request('DELETE', `/stories/${createdStoryId}`, null, userAToken);
      record('Stories', 'Delete Story', delStory.status === 200 && delStory.body?.success);
    }
  } catch (err) {
    record('Stories', 'Stories Exception', false, err.message);
  }

  // 6. CHAT & MESSAGING MODULE
  let conversationId = null;
  let messageId = null;
  try {
    const createConvo = await request('POST', '/chats/conversations', {
      type: 'direct',
      recipientId: userBId,
    }, userAToken);
    const convoPass = (createConvo.status === 200 || createConvo.status === 201) && createConvo.body?.success;
    record('Chat', 'Create Direct Conversation', convoPass, convoPass ? '' : JSON.stringify(createConvo.body));
    if (convoPass) {
      conversationId = createConvo.body.data.id;
    }

    if (conversationId) {
      const sendMsg = await request('POST', `/chats/conversations/${conversationId}/messages`, {
        type: 'text',
        content: 'Hello from User A during automated audit!',
      }, userAToken);
      const msgPass = sendMsg.status === 201 && sendMsg.body?.success;
      record('Chat', 'Send 1-on-1 Text Message', msgPass);
      if (msgPass) {
        messageId = sendMsg.body.data.id;
      }

      const getMsgs = await request('GET', `/chats/conversations/${conversationId}/messages`, null, userBToken);
      record('Chat', 'Fetch Conversation Messages (User B)', getMsgs.status === 200 && (Array.isArray(getMsgs.body?.data) || Array.isArray(getMsgs.body?.data?.items)));

      if (messageId) {
        const react = await request('POST', `/chats/messages/${messageId}/reactions`, {
          emoji: '🔥',
        }, userBToken);
        record('Chat', 'Add Message Reaction (User B)', react.status === 200 && react.body?.success);

        const edit = await request('PATCH', `/chats/messages/${messageId}`, {
          content: 'Edited message content during QA audit',
        }, userAToken);
        record('Chat', 'Edit Message (User A)', edit.status === 200 && edit.body?.success);
      }

      const markRead = await request('POST', `/chats/conversations/${conversationId}/read`, null, userBToken);
      record('Chat', 'Mark Conversation as Read', markRead.status === 200 && markRead.body?.success);

      // Group Chat
      const createGroup = await request('POST', '/chats/conversations', {
        type: 'group',
        participantIds: [userBId],
        title: `QA Audit Group ${uniqueId}`,
      }, userAToken);
      record('Group Chat', 'Create Group Chat', createGroup.status === 201 && createGroup.body?.success);

      if (messageId) {
        const delMsg = await request('DELETE', `/chats/messages/${messageId}`, null, userAToken);
        record('Chat', 'Delete Message for Everyone', delMsg.status === 200 && delMsg.body?.success);
      }
    }
  } catch (err) {
    record('Chat', 'Chat Flow Exception', false, err.message);
  }

  // 7. PRIVATE ROOMS MODULE
  let roomId = null;
  try {
    const createRoom = await request('POST', '/rooms', {
      name: `Secure Room ${uniqueId}`,
      roomKey: 'AuditSecretKey123',
      disappearingTimerSeconds: 60,
      privacySettings: {
        allowMediaSave: false,
        viewOnceOnly: true,
      },
    }, userAToken);
    const roomPass = createRoom.status === 201 && createRoom.body?.success;
    record('Private Room', 'Create Private Room with Encryption Key', roomPass);
    if (roomPass) {
      roomId = createRoom.body.data.id;
    }

    if (roomId) {
      const joinRoom = await request('POST', '/rooms/join', {
        roomId,
        roomKey: 'AuditSecretKey123',
      }, userBToken);
      record('Private Room', 'Join Private Room with Key (User B)', joinRoom.status === 200 && joinRoom.body?.success);

      const roomDetails = await request('GET', `/rooms/${roomId}`, null, userAToken);
      record('Private Room', 'Fetch Room Details & Settings', roomDetails.status === 200 && roomDetails.body?.success);

      const rotateKey = await request('POST', `/rooms/${roomId}/rotate-key`, {
        newRoomKey: 'NewAuditSecretKey456',
      }, userAToken);
      record('Private Room', 'Rotate Room Encryption Key', rotateKey.status === 200 && rotateKey.body?.success);

      const leaveRoom = await request('POST', `/rooms/${roomId}/leave`, null, userBToken);
      record('Private Room', 'Leave Private Room (User B)', leaveRoom.status === 200 && leaveRoom.body?.success);

      const delRoom = await request('DELETE', `/rooms/${roomId}`, null, userAToken);
      record('Private Room', 'Delete Private Room for Everyone', delRoom.status === 200 && delRoom.body?.success);
    }
  } catch (err) {
    record('Private Room', 'Private Room Exception', false, err.message);
  }

  // 8. VOICE & VIDEO CALLS MODULE
  let callId = null;
  try {
    const initCall = await request('POST', '/calls/initiate', {
      receiverId: userBId,
      callType: 'video',
    }, userAToken);
    const callPass = initCall.status === 201 && initCall.body?.success;
    record('Voice/Video Calls', 'Initiate Video Call', callPass);
    if (callPass) {
      callId = initCall.body.data.id;
    }

    if (callId) {
      const getToken = await request('GET', `/calls/${callId}/token`, null, userAToken);
      record('Voice/Video Calls', 'Fetch LiveKit / WebRTC Call Token', getToken.status === 200 && getToken.body?.success);

      const acceptCall = await request('POST', `/calls/${callId}/accept`, null, userBToken);
      record('Voice/Video Calls', 'Accept Call (User B)', acceptCall.status === 200 && acceptCall.body?.success);

      const endCall = await request('POST', `/calls/${callId}/end`, null, userAToken);
      record('Voice/Video Calls', 'End Call Session', endCall.status === 200 && endCall.body?.success);

      const callHistory = await request('GET', '/calls/history', null, userAToken);
      record('Voice/Video Calls', 'Fetch Call History Log', callHistory.status === 200 && Array.isArray(callHistory.body?.data));
    }
  } catch (err) {
    record('Voice/Video Calls', 'Calls Exception', false, err.message);
  }

  // 9. MUSIC & NOTIFICATIONS & NOTES MODULES
  try {
    const musicCatalog = await request('GET', '/music/catalog', null, userAToken);
    record('Music', 'Fetch Music Catalog', musicCatalog.status === 200 && musicCatalog.body?.success);

    const musicSearch = await request('GET', '/music/search?q=mozhi', null, userAToken);
    record('Music', 'Search Music Tracks', musicSearch.status === 200 && musicSearch.body?.success);

    const notifList = await request('GET', '/notifications', null, userAToken);
    record('Notifications', 'Fetch Notifications Feed', notifList.status === 200 && notifList.body?.success);

    const markAllRead = await request('POST', '/notifications/read-all', null, userAToken);
    record('Notifications', 'Mark All Notifications Read', markAllRead.status === 200 && markAllRead.body?.success);

    const createNote = await request('POST', '/notes/private', {
      title: 'QA Note',
      content: 'Secret audit note content',
    }, userAToken);
    record('Notes', 'Create Private Note', createNote.status === 201 && createNote.body?.success);

    const getNotes = await request('GET', '/notes/private', null, userAToken);
    record('Notes', 'Fetch Private Notes', getNotes.status === 200 && Array.isArray(getNotes.body?.data));

    const userSearch = await request('GET', `/users/search?q=audita_${uniqueId}`, null, userBToken);
    record('Search', 'Search Users & Discovery', userSearch.status === 200 && userSearch.body?.success);
  } catch (err) {
    record('Notes/Music/Search', 'Misc Exception', false, err.message);
  }

  console.log('\n=== AUDIT SUMMARY ===');
  const passedCount = results.filter((r) => r.status === 'PASS').length;
  const totalCount = results.length;
  console.log(`Total Scenarios: ${totalCount}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${totalCount - passedCount}`);
  console.log(`Pass Rate: ${((passedCount / totalCount) * 100).toFixed(1)}%\n`);
}

runAudit().catch(console.error);
