/**
 * INFERNUX AUTOMATED DEMO SEEDER
 * ----------------------------------------------------
 * Populates the database with rich demo content:
 * - 2 User Accounts (Gokul & Elena)
 * - Home Feed Social Posts with high-res photos
 * - 24-hour Stories with avatar rings
 * - Vertical Video Reels with background audio
 * - A Secret Cryptographic Protected Room with Key
 * - Ambient Music Tracks for the floating player
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return res.json();
}

async function seed() {
  console.log('\n🔥 [INFERNUX DEMO SEEDER] Starting demo content injection...\n');

  // 1. Create Gokul (Primary Demo User)
  console.log('👤 [1/6] Registering Primary Demo User...');
  let gokulUser;
  let gokulTokens;

  const reg1 = await api('/auth/register', {
    method: 'POST',
    body: {
      username: 'demo_user',
      displayName: 'Gokul (Lead Engineer)',
      email: 'demo@infernux.io',
      password: 'Password123!',
    },
  });

  if (reg1.success) {
    gokulUser = reg1.data.user;
    gokulTokens = reg1.data.tokens;
    console.log('   ✅ Registered @demo_user');
  } else {
    // If already exists, login
    const login1 = await api('/auth/login', {
      method: 'POST',
      body: {
        loginIdentifier: 'demo_user',
        password: 'Password123!',
      },
    });
    gokulUser = login1.data.user;
    gokulTokens = login1.data.tokens;
    console.log('   ✅ Logged in existing @demo_user');
  }

  // 2. Create Elena (Second Creator User)
  console.log('👤 [2/6] Registering Second Creator User...');
  let elenaTokens;
  const reg2 = await api('/auth/register', {
    method: 'POST',
    body: {
      username: 'elena_music',
      displayName: 'Elena Rostova 🎵',
      email: 'elena@infernux.io',
      password: 'Password123!',
    },
  });

  if (reg2.success) {
    elenaTokens = reg2.data.tokens;
    console.log('   ✅ Registered @elena_music');
  } else {
    const login2 = await api('/auth/login', {
      method: 'POST',
      body: {
        loginIdentifier: 'elena_music',
        password: 'Password123!',
      },
    });
    elenaTokens = login2.data.tokens;
    console.log('   ✅ Logged in existing @elena_music');
  }

  // 3. Create Social Posts for Home Feed
  console.log('📸 [3/6] Publishing Home Feed Social Posts...');
  await api('/posts', {
    method: 'POST',
    token: gokulTokens.accessToken,
    body: {
      caption: 'Infernux is officially live! 🔥 Seamless real-time messaging, cryptographic room keys, and WebRTC streaming unified in one mobile experience. What feature are you trying first?',
      media: [
        {
          url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
          type: 'image',
          width: 1200,
          height: 800,
        },
      ],
      hashtags: ['infernux', 'mobilearchitecture', 'typescript', 'webrtc'],
      isPrivate: false,
    },
  });

  await api('/posts', {
    method: 'POST',
    token: elenaTokens.accessToken,
    body: {
      caption: 'Late night sound design sessions in the studio. New ambient synthesizer loops coming to the Infernux music catalog! 🎧✨',
      media: [
        {
          url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&auto=format&fit=crop&q=80',
          type: 'image',
          width: 1200,
          height: 800,
        },
      ],
      hashtags: ['musicproducer', 'synthwave', 'infernux'],
      isPrivate: false,
    },
  });
  console.log('   ✅ Published 2 rich feed posts with photography');

  // 4. Create 24-hour Stories
  console.log('⏳ [4/6] Publishing 24-Hour Stories for the Stories Tray...');
  await api('/stories', {
    method: 'POST',
    token: gokulTokens.accessToken,
    body: {
      mediaType: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1080&auto=format&fit=crop&q=80',
      caption: 'Building the future of mobile communication ⚡',
      duration: 5,
    },
  });

  await api('/stories', {
    method: 'POST',
    token: elenaTokens.accessToken,
    body: {
      mediaType: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1080&auto=format&fit=crop&q=80',
      caption: 'Sound check before the stream 🎙️',
      duration: 5,
    },
  });
  console.log('   ✅ Published 2 active stories in the top ring tray');

  // 5. Create Reels
  console.log('🎬 [5/6] Publishing Vertical Reels...');
  await api('/reels', {
    method: 'POST',
    token: gokulTokens.accessToken,
    body: {
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
      caption: 'Cyberpunk visual aesthetics running at 60 FPS in Infernux ⚡ #cyberpunk #tech',
      duration: 15,
      hashtags: ['cyberpunk', 'tech', 'mobile'],
      audio: {
        title: 'Neon Drift (Original Mix)',
        artist: 'Infernux Audio Lab',
      },
    },
  });

  await api('/reels', {
    method: 'POST',
    token: elenaTokens.accessToken,
    body: {
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
      caption: 'Ambient waves & natural soundscapes. Turn on volume! 🌊🎶',
      duration: 15,
      hashtags: ['nature', 'ambient', 'relaxation'],
      audio: {
        title: 'Oceanic Frequencies',
        artist: 'Elena Rostova',
      },
    },
  });
  console.log('   ✅ Published 2 vertical video reels');

  // 6. Create a Cryptographic Protected Room
  console.log('🔐 [6/6] Generating Protected Room with Secret Key...');
  const roomRes = await api('/rooms', {
    method: 'POST',
    token: gokulTokens.accessToken,
    body: {
      name: 'Cyber Core Alpha',
      description: 'Private developer & architect enclave. Entrance restricted to cryptographic key holders.',
      isPrivate: true,
      requiresApproval: false,
    },
  });

  let secretKey = 'UNKNOWN';
  if (roomRes.success && roomRes.data) {
    secretKey = roomRes.data.initialKey?.key || roomRes.data.room?.id;
    console.log(`   ✅ Created Room: "Cyber Core Alpha"`);
    console.log(`   🔑 Secret Key: ${secretKey}`);
  }

  console.log('\n🎉 [SUCCESS] Demo environment seeded successfully!\n');
  console.log('═════════════════════════════════════════════════════════════════');
  console.log(' 🚀 DEMO CREDENTIALS TO TEST IN THE APP:');
  console.log('   Username / Email:  demo_user  (or demo@infernux.io)');
  console.log('   Password:          Password123!');
  console.log('-----------------------------------------------------------------');
  console.log(`   Secret Room Key:   ${secretKey}`);
  console.log('   Web UI Link:       http://localhost:8081/auth/login');
  console.log('═════════════════════════════════════════════════════════════════\n');
}

seed().catch(console.error);
