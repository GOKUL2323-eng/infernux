import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { config } from '../src/config/env';
import { User } from '../src/models/User';
import { Reel } from '../src/models/Reel';
import { reelService } from '../src/services/reel.service';

describe('Increment 2: Snap Moments, Advanced Stories, Reels Studio & Creator Dashboard', () => {
  let mongoServer: MongoMemoryServer;
  const app = createApp();

  let aliceId: string;
  let bobId: string;
  let carolId: string;
  let aliceToken: string;
  let bobToken: string;
  let carolToken: string;

  function signToken(userId: string, username: string): string {
    return jwt.sign({ userId, username, type: 'access' }, config.jwt.accessSecret, {
      expiresIn: '1h',
    });
  }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const [alice, bob, carol] = await User.create([
      {
        username: 'alice_inc2',
        displayName: 'Alice Studio',
        email: 'alice_inc2@test.local',
        passwordHash: 'hashedpw',
      },
      {
        username: 'bob_inc2',
        displayName: 'Bob Friend',
        email: 'bob_inc2@test.local',
        passwordHash: 'hashedpw',
      },
      {
        username: 'carol_inc2',
        displayName: 'Carol Other',
        email: 'carol_inc2@test.local',
        passwordHash: 'hashedpw',
      },
    ]);

    aliceId = alice._id.toString();
    bobId = bob._id.toString();
    carolId = carol._id.toString();
    aliceToken = signToken(aliceId, alice.username);
    bobToken = signToken(bobId, bob.username);
    carolToken = signToken(carolId, carol.username);

    // Bob and Carol follow Alice so audience filters evaluate properly
    await request(app)
      .post(`/api/v1/users/${aliceId}/follow`)
      .set('Authorization', `Bearer ${bobToken}`);
    await request(app)
      .post(`/api/v1/users/${aliceId}/follow`)
      .set('Authorization', `Bearer ${carolToken}`);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('supports Snap Moments delivery, view, single replay limit, and screenshot alert', async () => {
    const sendRes = await request(app)
      .post('/api/v1/snaps')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        recipientIds: [bobId],
        mediaType: 'image',
        mediaUrl: 'https://cdn.example.com/snap1.jpg',
        caption: 'Neon coffee run',
        filter: 'neon',
        overlays: [{ id: 'ov1', type: 'text', content: 'GM!', x: 0.5, y: 0.4, color: '#F04BBE' }],
        disappearingSeconds: 8,
        allowReplay: true,
      });

    expect(sendRes.status).toBe(201);
    const snapId = sendRes.body.data.id;
    expect(sendRes.body.data.filter).toBe('neon');

    const inboxRes = await request(app)
      .get('/api/v1/snaps/inbox')
      .set('Authorization', `Bearer ${bobToken}`);
    expect(inboxRes.status).toBe(200);
    expect(inboxRes.body.data.some((s: any) => s.id === snapId)).toBe(true);

    const openRes = await request(app)
      .post(`/api/v1/snaps/${snapId}/open`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(openRes.status).toBe(200);
    expect(openRes.body.data.hasViewedByMe).toBe(true);
    expect(openRes.body.data.mediaUrl).toBe('https://cdn.example.com/snap1.jpg');

    const replay1Res = await request(app)
      .post(`/api/v1/snaps/${snapId}/replay`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(replay1Res.status).toBe(200);
    expect(replay1Res.body.data.hasReplayedByMe).toBe(true);

    // Second replay must fail
    const replay2Res = await request(app)
      .post(`/api/v1/snaps/${snapId}/replay`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(replay2Res.status).toBeGreaterThanOrEqual(400);

    // After view + replay consumed, opening hides expired media URL
    const reopenedRes = await request(app)
      .post(`/api/v1/snaps/${snapId}/open`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(reopenedRes.status).toBe(200);
    expect(reopenedRes.body.data.isExpired).toBe(true);
    expect(reopenedRes.body.data.mediaUrl).toBe('');

    // Screenshot alert logged for sender
    const ssRes = await request(app)
      .post(`/api/v1/snaps/${snapId}/screenshot`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(ssRes.status).toBe(200);

    const sentRes = await request(app)
      .get('/api/v1/snaps/sent')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(sentRes.status).toBe(200);
    const aliceSnap = sentRes.body.data.find((s: any) => s.id === snapId);
    expect(aliceSnap.screenshotAlerts.length).toBe(1);
    expect(aliceSnap.screenshotAlerts[0].username).toBe('bob_inc2');
  });

  it('enforces Close Friends & Custom Story audiences, interactive stickers, reactions, and highlights', async () => {
    const toggleCfRes = await request(app)
      .put(`/api/v1/stories/close-friends/${bobId}/toggle`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(toggleCfRes.status).toBe(200);
    expect(toggleCfRes.body.data.isCloseFriend).toBe(true);

    // Close Friends story with Poll & Question Box stickers
    const cfStoryRes = await request(app)
      .post('/api/v1/stories')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        mediaType: 'image',
        mediaUrl: 'https://cdn.example.com/cf-story.jpg',
        caption: 'Close friends vote!',
        audience: 'close_friends',
        stickers: [
          {
            id: 'poll_1',
            kind: 'poll',
            question: 'Dark purple or Neon pink?',
            options: [
              { id: 'opt_a', text: 'Dark Purple' },
              { id: 'opt_b', text: 'Neon Pink' },
            ],
          },
          {
            id: 'qbox_1',
            kind: 'question_box',
            prompt: 'Ask me anything anonymously',
            allowAnonymous: true,
          },
        ],
      });
    expect(cfStoryRes.status).toBe(201);
    const cfStoryId = cfStoryRes.body.data.id;

    // Custom audience story for Carol only
    const customStoryRes = await request(app)
      .post('/api/v1/stories')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        mediaType: 'image',
        mediaUrl: 'https://cdn.example.com/custom-story.jpg',
        audience: 'custom',
        allowedUserIds: [carolId],
      });
    expect(customStoryRes.status).toBe(201);
    const customStoryId = customStoryRes.body.data.id;

    // Bob sees cfStoryId but NOT customStoryId
    const bobFeed = await request(app)
      .get('/api/v1/stories/feed')
      .set('Authorization', `Bearer ${bobToken}`);
    const bobAliceGroup = bobFeed.body.data.find((g: any) => g.user.id === aliceId);
    expect(bobAliceGroup).toBeDefined();
    expect(bobAliceGroup.stories.some((s: any) => s.id === cfStoryId)).toBe(true);
    expect(bobAliceGroup.stories.some((s: any) => s.id === customStoryId)).toBe(false);

    // Carol sees customStoryId but NOT cfStoryId
    const carolFeed = await request(app)
      .get('/api/v1/stories/feed')
      .set('Authorization', `Bearer ${carolToken}`);
    const carolAliceGroup = carolFeed.body.data.find((g: any) => g.user.id === aliceId);
    expect(carolAliceGroup).toBeDefined();
    expect(carolAliceGroup.stories.some((s: any) => s.id === customStoryId)).toBe(true);
    expect(carolAliceGroup.stories.some((s: any) => s.id === cfStoryId)).toBe(false);

    // Bob votes on poll + answers anonymous question + reacts
    const voteRes = await request(app)
      .post(`/api/v1/stories/${cfStoryId}/stickers/poll_1/interact`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ optionId: 'opt_a' });
    expect(voteRes.status).toBe(200);

    const answerRes = await request(app)
      .post(`/api/v1/stories/${cfStoryId}/stickers/qbox_1/interact`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ answerText: 'Love the new dark purple theme!', isAnonymous: true });
    expect(answerRes.status).toBe(200);

    const reactRes = await request(app)
      .post(`/api/v1/stories/${cfStoryId}/react`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ emoji: '💜' });
    expect(reactRes.status).toBe(200);
    expect(reactRes.body.data.reactions.length).toBeGreaterThanOrEqual(1);

    // Collaborator invite + Story Highlight lifecycle
    const collabRes = await request(app)
      .post(`/api/v1/stories/${cfStoryId}/collaborate`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ collaboratorId: bobId });
    expect(collabRes.status).toBe(200);

    const hlCreate = await request(app)
      .post('/api/v1/stories/highlights')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        title: 'Launch Week',
        coverUrl: 'https://cdn.example.com/hl-cover.jpg',
        storyIds: [cfStoryId],
      });
    expect(hlCreate.status).toBe(201);
    const hlId = hlCreate.body.data.id;

    const hlList = await request(app)
      .get(`/api/v1/stories/highlights/${aliceId}`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(hlList.status).toBe(200);
    expect(hlList.body.data.some((h: any) => h.id === hlId && h.title === 'Launch Week')).toBe(true);

    const hlDel = await request(app)
      .delete(`/api/v1/stories/highlights/${hlId}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(hlDel.status).toBe(200);
  });

  it('handles Collab Posts/Reels, Reels Studio Drafts/Scheduled publish, and Creator Analytics', async () => {
    // 1. Collaborative Post
    const postRes = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        caption: 'Joint drop with Bob!',
        media: [{ url: 'https://cdn.example.com/collab-post.jpg', type: 'image' }],
        collaboratorIds: [bobId],
      });
    expect(postRes.status).toBe(201);
    const collabPostId = postRes.body.data.id;

    const postCollabRespond = await request(app)
      .post(`/api/v1/posts/${collabPostId}/collab/respond`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ accept: true });
    expect(postCollabRespond.status).toBe(200);
    expect(postCollabRespond.body.data.accepted).toBe(true);

    // 2. Reels Studio Draft with trimming, speed, clips, textOverlays, voiceover, collab invite
    const draftRes = await request(app)
      .post('/api/v1/reels')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        videoUrl: 'https://cdn.example.com/studio-reel.mp4',
        thumbnailUrl: 'https://cdn.example.com/studio-thumb.jpg',
        caption: 'Behind the scenes #mozhi #studio',
        duration: 22,
        trimStartSec: 1.5,
        trimEndSec: 19,
        playbackSpeed: 1.5,
        clips: [
          { videoUrl: 'https://cdn.example.com/clip1.mp4', startSec: 0, endSec: 10, speed: 1 },
          { videoUrl: 'https://cdn.example.com/clip2.mp4', startSec: 2, endSec: 12, speed: 1.5 },
        ],
        voiceoverUrl: 'https://cdn.example.com/vo.m4a',
        musicVolume: 0.4,
        voiceoverVolume: 0.9,
        textOverlays: [{ id: 'txt1', text: 'Part 1', color: '#FFFFFF', y: 0.3 }],
        status: 'draft',
        collaboratorIds: [bobId],
      });
    expect(draftRes.status).toBe(201);
    const draftReelId = draftRes.body.data.id;
    expect(draftRes.body.data.status).toBe('draft');

    // Bob accepts Reel collab invite
    const reelCollabRespond = await request(app)
      .post(`/api/v1/reels/${draftReelId}/collab/respond`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ accept: true });
    expect(reelCollabRespond.status).toBe(200);
    expect(reelCollabRespond.body.data.accepted).toBe(true);

    // Draft should appear in Creator Queue, NOT public Reels feed
    const queueRes = await request(app)
      .get('/api/v1/creator/drafts')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(queueRes.status).toBe(200);
    expect(queueRes.body.data.some((r: any) => r.id === draftReelId)).toBe(true);

    const feedBeforePublish = await request(app)
      .get('/api/v1/reels/feed')
      .set('Authorization', `Bearer ${bobToken}`);
    expect(feedBeforePublish.body.data.items.some((r: any) => r.id === draftReelId)).toBe(false);

    // Publish draft manually via Creator endpoint
    const pubDraftRes = await request(app)
      .post(`/api/v1/creator/reels/${draftReelId}/publish`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(pubDraftRes.status).toBe(200);
    expect(pubDraftRes.body.data.status).toBe('published');

    // 3. Scheduled Reel published by background job
    const pastIso = new Date(Date.now() - 10_000).toISOString();
    const schedRes = await request(app)
      .post('/api/v1/reels')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        videoUrl: 'https://cdn.example.com/scheduled.mp4',
        thumbnailUrl: 'https://cdn.example.com/scheduled-thumb.jpg',
        caption: 'Scheduled launch!',
        duration: 15,
        status: 'scheduled',
        scheduledFor: pastIso,
      });
    expect(schedRes.status).toBe(201);
    const schedReelId = schedRes.body.data.id;

    const publishedCount = await reelService.publishDueScheduledReels();
    expect(publishedCount).toBeGreaterThanOrEqual(1);

    const schedDoc = await Reel.findById(schedReelId);
    expect(schedDoc?.status).toBe('published');

    // Record view & like on draftReelId then check Creator Analytics
    await request(app)
      .post(`/api/v1/reels/${draftReelId}/view`)
      .set('Authorization', `Bearer ${bobToken}`);
    await request(app)
      .post(`/api/v1/reels/${draftReelId}/like`)
      .set('Authorization', `Bearer ${bobToken}`);

    const analyticsRes = await request(app)
      .get('/api/v1/creator/analytics')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.data.reelsCount).toBeGreaterThanOrEqual(2);
    expect(analyticsRes.body.data.postsCount).toBeGreaterThanOrEqual(1);
    expect(analyticsRes.body.data.totalViews).toBeGreaterThanOrEqual(1);
    expect(analyticsRes.body.data.totalLikes).toBeGreaterThanOrEqual(1);
  });
});
