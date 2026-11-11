import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { config } from '../src/config/env';
import { User } from '../src/models/User';
import { MemoryCapsule } from '../src/models/MemoryCapsule';
import { experienceService } from '../src/services/experience.service';

describe('Increment 4: Memory Capsules, MoodSpace, Together Mode & Smart Presence', () => {
  let mongoServer: MongoMemoryServer;
  const app = createApp();

  let aliceId: string;
  let bobId: string;
  let aliceToken: string;
  let bobToken: string;

  function signToken(userId: string, username: string): string {
    return jwt.sign({ userId, username, type: 'access' }, config.jwt.accessSecret, {
      expiresIn: '1h',
    });
  }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const [alice, bob] = await User.create([
      {
        username: 'alice_exp',
        displayName: 'Alice Vibe',
        email: 'alice_exp@test.local',
        passwordHash: 'hashedpw',
      },
      {
        username: 'bob_exp',
        displayName: 'Bob CoWatch',
        email: 'bob_exp@test.local',
        passwordHash: 'hashedpw',
      },
    ]);

    aliceId = alice._id.toString();
    bobId = bob._id.toString();
    aliceToken = signToken(aliceId, alice.username);
    bobToken = signToken(bobId, bob.username);

    await request(app)
      .post(`/api/v1/users/${aliceId}/follow`)
      .set('Authorization', `Bearer ${bobToken}`);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('masks locked Memory Capsules until unlockAt arrives and notifies via job', async () => {
    const futureIso = new Date(Date.now() + 86_400_000).toISOString();
    const createRes = await request(app)
      .post('/api/v1/experiences/capsules')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        recipientIds: [bobId],
        title: 'Graduation Time Capsule',
        message: 'Remember this day forever!',
        mediaUrls: ['https://cdn.example.com/cap1.jpg'],
        unlockAt: futureIso,
      });

    expect(createRes.status).toBe(201);
    const capId = createRes.body.data.id;
    expect(createRes.body.data.isUnlocked).toBe(false);
    expect(createRes.body.data.message).not.toBe('Remember this day forever!');

    // Fast-forward unlockAt into the past and execute unlock job
    await MemoryCapsule.findByIdAndUpdate(capId, { unlockAt: new Date(Date.now() - 5000) });
    const unlockedCount = await experienceService.unlockDueCapsules();
    expect(unlockedCount).toBeGreaterThanOrEqual(1);

    const bobCapsules = await request(app)
      .get('/api/v1/experiences/capsules')
      .set('Authorization', `Bearer ${bobToken}`);
    expect(bobCapsules.status).toBe(200);
    const opened = bobCapsules.body.data.find((c: any) => c.id === capId);
    expect(opened.isUnlocked).toBe(true);
    expect(opened.message).toBe('Remember this day forever!');
  });

  it('tracks MoodSpace entries, stats breakdown, and follower visibility feed', async () => {
    const pubMood = await request(app)
      .post('/api/v1/experiences/moods')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        mood: 'inspired',
        emoji: '✨',
        note: 'Shipping Phase 6!',
        colorHex: '#A020F0',
        isPublic: true,
      });
    expect(pubMood.status).toBe(201);

    const privMood = await request(app)
      .post('/api/v1/experiences/moods')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        mood: 'calm',
        emoji: '🌙',
        note: 'Private reflection',
        isPublic: false,
      });
    expect(privMood.status).toBe(201);

    const myStats = await request(app)
      .get('/api/v1/experiences/moods')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(myStats.status).toBe(200);
    expect(myStats.body.data.counts.inspired).toBe(1);
    expect(myStats.body.data.counts.calm).toBe(1);

    const bobFeed = await request(app)
      .get('/api/v1/experiences/moods/feed')
      .set('Authorization', `Bearer ${bobToken}`);
    expect(bobFeed.status).toBe(200);
    expect(bobFeed.body.data.some((m: any) => m.mood === 'inspired')).toBe(true);
    expect(bobFeed.body.data.some((m: any) => m.note === 'Private reflection')).toBe(false);
  });

  it('synchronizes Together Mode sessions and updates Smart Presence, Interactive Profile & Guestbook', async () => {
    const togetherRes = await request(app)
      .post('/api/v1/experiences/together')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        title: 'Midnight MV Watch Party',
        sessionType: 'watch',
        mediaUrl: 'https://cdn.example.com/video.mp4',
        trackTitle: 'Neon Lights',
      });
    expect(togetherRes.status).toBe(201);
    const sessionId = togetherRes.body.data.id;

    const joinRes = await request(app)
      .post(`/api/v1/experiences/together/${sessionId}/join`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.data.participantIds).toContain(bobId);

    const syncRes = await request(app)
      .post(`/api/v1/experiences/together/${sessionId}/sync`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ playbackPositionSec: 42.5, isPlaying: true });
    expect(syncRes.status).toBe(200);
    expect(syncRes.body.data.playbackPositionSec).toBe(42.5);
    expect(syncRes.body.data.isPlaying).toBe(true);

    const endRes = await request(app)
      .post(`/api/v1/experiences/together/${sessionId}/end`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(endRes.status).toBe(200);
    expect(endRes.body.data.status).toBe('ended');

    // Smart presence + Interactive Profile + Guestbook
    const presRes = await request(app)
      .put('/api/v1/experiences/presence')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ statusMode: 'focus', customStatusText: 'Deep Work', focusDurationMinutes: 45 });
    expect(presRes.status).toBe(200);
    expect(presRes.body.data.statusMode).toBe('focus');
    expect(presRes.body.data.focusModeUntil).toBeDefined();

    const profRes = await request(app)
      .put('/api/v1/experiences/profile/interactive')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        profileThemeAccent: '#F04BBE',
        featuredSongTitle: 'Midnight City - M83',
        profilePrompts: [{ id: 'p1', question: 'Currently building', answer: 'MOZHI v2' }],
      });
    expect(profRes.status).toBe(200);
    expect(profRes.body.data.featuredSongTitle).toBe('Midnight City - M83');

    const gbRes = await request(app)
      .post(`/api/v1/experiences/profile/${aliceId}/guestbook`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ emoji: '🔥', note: 'Cool profile setup!' });
    expect(gbRes.status).toBe(201);
    expect(gbRes.body.data[0].note).toBe('Cool profile setup!');
  });
});

