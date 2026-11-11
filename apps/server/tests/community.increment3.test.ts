import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { config } from '../src/config/env';
import { User } from '../src/models/User';
import { SharedFileRecord } from '../src/models/SharedFileRecord';

describe('Increment 3: Communities, Live Audio Rooms & Shared Files', () => {
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
        username: 'alice_comm',
        displayName: 'Alice Founder',
        email: 'alice_comm@test.local',
        passwordHash: 'hashedpw',
      },
      {
        username: 'bob_comm',
        displayName: 'Bob Member',
        email: 'bob_comm@test.local',
        passwordHash: 'hashedpw',
      },
    ]);

    aliceId = alice._id.toString();
    bobId = bob._id.toString();
    aliceToken = signToken(aliceId, alice.username);
    bobToken = signToken(bobId, bob.username);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('supports Community spaces, role-gated announcement channels, threads, search & pinning', async () => {
    const createRes = await request(app)
      .post('/api/v1/communities')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        name: 'MOZHI Creators Guild',
        description: 'Collaborative video & music builders',
        category: 'creators',
        isPrivate: false,
      });
    expect(createRes.status).toBe(201);
    const communityId = createRes.body.data.id;
    expect(createRes.body.data.channelsCount).toBe(2);

    const joinRes = await request(app)
      .post(`/api/v1/communities/${communityId}/join`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.data.membersCount).toBe(2);

    const detailRes = await request(app)
      .get(`/api/v1/communities/${communityId}`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(detailRes.status).toBe(200);
    const channels = detailRes.body.data.channels as any[];
    const announcementCh = channels.find((c) => c.type === 'announcement');
    const generalCh = channels.find((c) => c.name === 'general');
    expect(announcementCh).toBeDefined();
    expect(generalCh).toBeDefined();

    // Regular member blocked from posting in announcement-only channel
    const blockedAnnounceRes = await request(app)
      .post(`/api/v1/communities/${communityId}/channels/${announcementCh.id}/posts`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ content: 'Unauthorized update' });
    expect(blockedAnnounceRes.status).toBe(403);

    // Promote Bob to moderator -> now allowed to post in announcements
    const promoteRes = await request(app)
      .put(`/api/v1/communities/${communityId}/roles`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ userId: bobId, role: 'moderator' });
    expect(promoteRes.status).toBe(200);

    const modPostRes = await request(app)
      .post(`/api/v1/communities/${communityId}/channels/${announcementCh.id}/posts`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ title: 'Welcome Note', content: 'Moderator kickoff announcement!' });
    expect(modPostRes.status).toBe(201);

    // Thread creation + reply + search + pin
    const postRes = await request(app)
      .post(`/api/v1/communities/${communityId}/channels/${generalCh.id}/posts`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ title: 'Audio Tips', content: 'Use 48kHz WAV stems for clean reels.' });
    expect(postRes.status).toBe(201);
    const parentPostId = postRes.body.data.id;

    const replyRes = await request(app)
      .post(`/api/v1/communities/${communityId}/channels/${generalCh.id}/posts`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Great tip!', parentPostId });
    expect(replyRes.status).toBe(201);

    const searchRes = await request(app)
      .get(`/api/v1/communities/${communityId}/channels/${generalCh.id}/posts?q=WAV`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.some((p: any) => p.id === parentPostId)).toBe(true);

    const pinRes = await request(app)
      .post(`/api/v1/communities/${communityId}/posts/${parentPostId}/pin`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(pinRes.status).toBe(200);
    expect(pinRes.body.data.pinned).toBe(true);
  });

  it('manages Live Audio Rooms: stage join, hand raise, speaker promotion, mute, reaction & end', async () => {
    const createRes = await request(app)
      .post('/api/v1/audio-rooms')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Late Night Creator Stage', topic: 'Feedback & Chill' });
    expect(createRes.status).toBe(201);
    const roomId = createRes.body.data.id;

    const joinRes = await request(app)
      .post(`/api/v1/audio-rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.data.participants.length).toBe(2);

    const handRes = await request(app)
      .post(`/api/v1/audio-rooms/${roomId}/hand`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(handRes.status).toBe(200);
    expect(handRes.body.data.speakerRequests).toContain(bobId);

    const approveRes = await request(app)
      .post(`/api/v1/audio-rooms/${roomId}/speakers/${bobId}/approve`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(approveRes.status).toBe(200);
    const bobParticipant = approveRes.body.data.participants.find((p: any) => p.userId === bobId);
    expect(bobParticipant.role).toBe('speaker');
    expect(bobParticipant.isMuted).toBe(false);

    const muteRes = await request(app)
      .post(`/api/v1/audio-rooms/${roomId}/mute`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({});
    expect(muteRes.status).toBe(200);
    expect(muteRes.body.data.participants.find((p: any) => p.userId === bobId).isMuted).toBe(true);

    const reactRes = await request(app)
      .post(`/api/v1/audio-rooms/${roomId}/react`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ emoji: '🔥' });
    expect(reactRes.status).toBe(200);

    const endRes = await request(app)
      .post(`/api/v1/audio-rooms/${roomId}/end`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(endRes.status).toBe(200);
    expect(endRes.body.data.status).toBe('ended');
  });

  it('tracks file library quota, expiring share links, and blocks over-quota uploads', async () => {
    const file1Res = await request(app)
      .post('/api/v1/media/files')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        fileName: 'press-kit.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 50_000_000, // ~47.68 MB
        fileUrl: 'https://cdn.example.com/press-kit.pdf',
        scope: 'personal',
        expiresInHours: 24,
      });
    expect(file1Res.status).toBe(201);
    const file1Id = file1Res.body.data.id;
    const token1 = file1Res.body.data.shareToken;

    const file2Res = await request(app)
      .post('/api/v1/media/files')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        fileName: 'stems.zip',
        mimeType: 'application/zip',
        fileSizeBytes: 50_000_000,
        fileUrl: 'https://cdn.example.com/stems.zip',
      });
    expect(file2Res.status).toBe(201);

    // Exceeding 100 MB limit should reject
    const overQuotaRes = await request(app)
      .post('/api/v1/media/files')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        fileName: 'huge.zip',
        mimeType: 'application/zip',
        fileSizeBytes: 10_000_000,
        fileUrl: 'https://cdn.example.com/huge.zip',
      });
    expect(overQuotaRes.status).toBeGreaterThanOrEqual(400);

    const quotaRes = await request(app)
      .get('/api/v1/media/files/quota')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(quotaRes.status).toBe(200);
    expect(quotaRes.body.data.usedBytes).toBe(100_000_000);

    // Access by token succeeds before expiry, fails after expiry
    const shareOk = await request(app)
      .get(`/api/v1/media/files/share/${token1}`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(shareOk.status).toBe(200);
    expect(shareOk.body.data.downloadsCount).toBe(1);

    await SharedFileRecord.findByIdAndUpdate(file1Id, { expiresAt: new Date(Date.now() - 5000) });
    const shareExpired = await request(app)
      .get(`/api/v1/media/files/share/${token1}`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(shareExpired.status).toBeGreaterThanOrEqual(400);
  });
});

