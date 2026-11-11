import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { config } from '../src/config/env';
import { User } from '../src/models/User';
import { Session } from '../src/models/Session';
import { Conversation } from '../src/models/Conversation';
import { Message } from '../src/models/Message';
import { Post } from '../src/models/Post';
import { detectSpamSignal } from '../src/services/moderation.service';

describe('Increment 5: AI Assistant, Security Center & Admin Moderation', () => {
  let mongoServer: MongoMemoryServer;
  const app = createApp();

  let adminId: string;
  let userId: string;
  let modCandidateId: string;
  let adminToken: string;
  let userToken: string;
  let modCandidateToken: string;

  function signToken(id: string, username: string): string {
    return jwt.sign({ userId: id, username, type: 'access' }, config.jwt.accessSecret, {
      expiresIn: '1h',
    });
  }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const passwordHash = await bcrypt.hash('StrongPass123!', 10);

    const [adminUser, regularUser, modCandidate] = await User.create([
      {
        username: 'admin_platform',
        displayName: 'Platform Admin',
        email: 'admin_platform@test.local',
        passwordHash,
        role: 'admin',
      },
      {
        username: 'alice_platform',
        displayName: 'Alice Regular',
        email: 'alice_platform@test.local',
        passwordHash,
        role: 'user',
      },
      {
        username: 'mod_platform',
        displayName: 'Mod Candidate',
        email: 'mod_platform@test.local',
        passwordHash,
        role: 'user',
      },
    ]);

    adminId = adminUser._id.toString();
    userId = regularUser._id.toString();
    modCandidateId = modCandidate._id.toString();
    adminToken = signToken(adminId, adminUser.username);
    userToken = signToken(userId, regularUser.username);
    modCandidateToken = signToken(modCandidateId, modCandidate.username);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('summarizes conversations, extracts tasks/dates, and generates smart replies & content assist', async () => {
    const conv = await Conversation.create({
      type: 'direct',
      participants: [userId, adminId],
    });

    await Message.create([
      {
        conversationId: conv._id,
        senderId: adminId,
        contentType: 'text',
        content: 'Hey Alice, can we meet tomorrow at 5:30 PM to review the product launch?',
      },
      {
        conversationId: conv._id,
        senderId: userId,
        contentType: 'text',
        content: 'Sure! Please prepare the deployment checklist before Friday.',
      },
    ]);

    // Non-participant must get 403
    const deniedRes = await request(app)
      .post('/api/v1/ai/summarize')
      .set('Authorization', `Bearer ${modCandidateToken}`)
      .send({ conversationId: conv._id.toString() });
    expect(deniedRes.status).toBe(403);

    const summaryRes = await request(app)
      .post('/api/v1/ai/summarize')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ conversationId: conv._id.toString() });

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.engine).toBe('mozhi-local-nlp-v1');
    expect(summaryRes.body.data.extractedDates.length).toBeGreaterThanOrEqual(2);
    expect(summaryRes.body.data.extractedTasks.length).toBeGreaterThanOrEqual(1);
    expect(summaryRes.body.data.disclaimer).toContain('deterministic');

    const replyRes = await request(app)
      .post('/api/v1/ai/replies')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ conversationId: conv._id.toString() });

    expect(replyRes.status).toBe(200);
    expect(replyRes.body.data.suggestions.length).toBe(3);

    const assistRes = await request(app)
      .post('/api/v1/ai/content-assist')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        topic: 'Sunset Rooftop Acoustic Session',
        tone: 'hype',
        mediaDescription: 'warm golden hour guitar performance on a city rooftop',
      });

    expect(assistRes.status).toBe(200);
    expect(assistRes.body.data.captions.length).toBe(3);
    expect(assistRes.body.data.hashtags.some((t: string) => t.startsWith('#'))).toBe(true);
    expect(assistRes.body.data.altText).toContain('guitar');
  });

  it('tracks login activity, lists active sessions, revokes sessions remotely, and provides disclosure', async () => {
    // Trigger 1 failed login + 2 successful logins
    const badLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'MozhiTest/WrongPw')
      .send({ loginIdentifier: 'alice_platform', password: 'WrongPassword!' });
    expect(badLogin.status).toBe(401);

    const loginOne = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'MozhiAndroid/1.0')
      .send({ loginIdentifier: 'alice_platform', password: 'StrongPass123!', deviceId: 'pixel-9' });
    expect(loginOne.status).toBe(200);

    const loginTwo = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'MozhiWeb/2.0')
      .send({ loginIdentifier: 'alice_platform', password: 'StrongPass123!', deviceId: 'desktop-web' });
    expect(loginTwo.status).toBe(200);
    const keepRefreshToken = loginTwo.body.data.tokens.refreshToken;

    const overviewRes = await request(app)
      .get('/api/v1/security/overview')
      .set('Authorization', `Bearer ${userToken}`);

    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.data.sessions.length).toBe(2);
    expect(
      overviewRes.body.data.loginActivity.some((entry: any) => entry.status === 'failed')
    ).toBe(true);
    expect(
      overviewRes.body.data.loginActivity.some((entry: any) => entry.status === 'success')
    ).toBe(true);
    expect(overviewRes.body.data.securityDisclosure).toContain('bcrypt');

    const sessionToRevoke = overviewRes.body.data.sessions.find(
      (s: any) => s.deviceId === 'pixel-9'
    );
    const revokeRes = await request(app)
      .post(`/api/v1/security/sessions/${sessionToRevoke.id}/revoke`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.data.isRevoked).toBe(true);

    // Log back in once more and test revoke-all keeping desktop-web
    await request(app)
      .post('/api/v1/auth/login')
      .send({ loginIdentifier: 'alice_platform', password: 'StrongPass123!', deviceId: 'ipad' });

    const revokeAllRes = await request(app)
      .post('/api/v1/security/sessions/revoke-all')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currentRefreshToken: keepRefreshToken });
    expect(revokeAllRes.status).toBe(200);
    expect(revokeAllRes.body.data.revokedCount).toBe(1);

    const afterOverview = await request(app)
      .get('/api/v1/security/overview')
      .set('Authorization', `Bearer ${userToken}`);
    expect(afterOverview.body.data.sessions.length).toBe(1);
    expect(afterOverview.body.data.sessions[0].deviceId).toBe('desktop-web');
  });

  it('enforces admin/moderator RBAC, removes reported content, logs audit trail, and handles suspension appeals', async () => {
    expect(detectSpamSignal('guaranteed profit free crypto whatsapp me now').isFlagged).toBe(true);
    expect(detectSpamSignal('Having coffee with friends this afternoon').isFlagged).toBe(false);

    // Regular user cannot list reports or promote roles
    const forbiddenQueue = await request(app)
      .get('/api/v1/moderation/reports')
      .set('Authorization', `Bearer ${userToken}`);
    expect(forbiddenQueue.status).toBe(403);

    const forbiddenRole = await request(app)
      .post(`/api/v1/moderation/users/${modCandidateId}/role`)
      .set('Authorization', `Bearer ${modCandidateToken}`)
      .send({ role: 'moderator' });
    expect(forbiddenRole.status).toBe(403);

    // Admin promotes modCandidate to moderator
    const promoteRes = await request(app)
      .post(`/api/v1/moderation/users/${modCandidateId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'moderator' });
    expect(promoteRes.status).toBe(200);
    expect(promoteRes.body.data.role).toBe('moderator');

    // Create a post and report it
    const badPost = await Post.create({
      authorId: userId,
      caption: 'Guaranteed profit free crypto dm now',
      media: [{ url: 'https://cdn.example.com/spam.jpg', type: 'image' }],
    });

    const reportRes = await request(app)
      .post('/api/v1/moderation/reports')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        targetType: 'post',
        targetId: badPost._id.toString(),
        reason: 'spam',
        description: 'Automated scam spam post',
      });
    expect(reportRes.status).toBe(201);
    const reportId = reportRes.body.data.id;

    // Moderator resolves report & deletes content
    const resolveRes = await request(app)
      .post(`/api/v1/moderation/reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${modCandidateToken}`)
      .send({
        status: 'resolved',
        actionNote: 'Removed verified spam post',
        removeTargetContent: true,
      });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe('resolved');
    expect(resolveRes.body.data.contentRemoved).toBe(true);
    expect(await Post.findById(badPost._id)).toBeNull();

    // Moderator suspends user -> revokes sessions
    const suspendRes = await request(app)
      .post(`/api/v1/moderation/users/${userId}/suspend`)
      .set('Authorization', `Bearer ${modCandidateToken}`)
      .send({ suspend: true, reason: 'Repeated spam violations' });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.isSuspended).toBe(true);

    const activeUserSessions = await Session.countDocuments({ userId, isRevoked: false });
    expect(activeUserSessions).toBe(0);

    // Suspended user submits appeal
    const appealRes = await request(app)
      .post('/api/v1/moderation/appeals')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reason: 'My account was compromised yesterday and I have rotated my password.',
        details: 'Please restore access after verification.',
      });
    expect(appealRes.status).toBe(201);
    const appealId = appealRes.body.data.id;

    const myAppealsRes = await request(app)
      .get('/api/v1/moderation/appeals')
      .set('Authorization', `Bearer ${userToken}`);
    expect(myAppealsRes.status).toBe(200);
    expect(myAppealsRes.body.data.some((a: any) => a.id === appealId)).toBe(true);

    // Moderator approves appeal -> restores account
    const reviewRes = await request(app)
      .post(`/api/v1/moderation/appeals/${appealId}/review`)
      .set('Authorization', `Bearer ${modCandidateToken}`)
      .send({ status: 'approved', reviewerNotes: 'Session audit verified, restored account' });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.status).toBe('approved');

    const restoredUser = await User.findById(userId);
    expect(restoredUser?.isSuspended).toBe(false);

    // Verify full ModerationLog audit history
    const logsRes = await request(app)
      .get('/api/v1/moderation/logs')
      .set('Authorization', `Bearer ${modCandidateToken}`);
    expect(logsRes.status).toBe(200);
    const actions = logsRes.body.data.map((l: any) => l.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'role_updated',
        'content_removed',
        'report_resolved',
        'user_suspended',
        'appeal_approved',
      ])
    );
  });
});
