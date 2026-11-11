import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { config } from '../src/config/env';
import { User } from '../src/models/User';
import { FriendStreak } from '../src/models/FriendStreak';
import { Message } from '../src/models/Message';
import { chatService } from '../src/services/chat.service';

describe('Increment 1: Advanced Messaging, Interactive Cards, Organization & Streaks', () => {
  let mongoServer: MongoMemoryServer;
  const app = createApp();

  let aliceId: string;
  let bobId: string;
  let carolId: string;
  let aliceToken: string;
  let bobToken: string;
  let directConvId: string;
  let groupConvId: string;

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
        username: 'alice_test',
        displayName: 'Alice Test',
        email: 'alice@test.local',
        passwordHash: 'hashedpw',
      },
      {
        username: 'bob_test',
        displayName: 'Bob Test',
        email: 'bob@test.local',
        passwordHash: 'hashedpw',
      },
      {
        username: 'carol_test',
        displayName: 'Carol Test',
        email: 'carol@test.local',
        passwordHash: 'hashedpw',
      },
    ]);

    aliceId = alice._id.toString();
    bobId = bob._id.toString();
    carolId = carol._id.toString();
    aliceToken = signToken(aliceId, alice.username);
    bobToken = signToken(bobId, bob.username);

    const directRes = await request(app)
      .post('/api/v1/chats/conversations')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ type: 'direct', recipientId: bobId });
    expect(directRes.status).toBe(201);
    directConvId = directRes.body.data.conversationId;

    const groupRes = await request(app)
      .post('/api/v1/chats/conversations')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        type: 'group',
        title: 'Design Team',
        participantIds: [bobId, carolId],
      });
    expect(groupRes.status).toBe(201);
    groupConvId = groupRes.body.data.conversationId;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('syncs cross-device drafts and clears draft after immediate message send', async () => {
    const putRes = await request(app)
      .put(`/api/v1/chats/conversations/${directConvId}/draft`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Draft message in progress' });
    expect(putRes.status).toBe(200);
    expect(putRes.body.data.content).toBe('Draft message in progress');

    const getRes = await request(app)
      .get(`/api/v1/chats/conversations/${directConvId}/draft`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.content).toBe('Draft message in progress');

    const sendRes = await request(app)
      .post(`/api/v1/chats/conversations/${directConvId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Hello', contentType: 'text' });
    expect(sendRes.status).toBe(201);

    const afterDraftRes = await request(app)
      .get(`/api/v1/chats/conversations/${directConvId}/draft`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(afterDraftRes.body.data.content).toBe('');
  });

  it('handles scheduled messages: hidden until delivery time, cancellable, and delivered by job', async () => {
    const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const cancelTime = new Date(Date.now() + 120 * 60 * 1000).toISOString();

    const schedRes1 = await request(app)
      .post(`/api/v1/chats/conversations/${directConvId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Scheduled launch alert', scheduledFor: futureTime });
    expect(schedRes1.status).toBe(201);
    expect(schedRes1.body.data.isScheduled).toBe(true);
    const deliverMsgId = schedRes1.body.data.id;

    const schedRes2 = await request(app)
      .post(`/api/v1/chats/conversations/${directConvId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'To be cancelled', scheduledFor: cancelTime });
    const cancelMsgId = schedRes2.body.data.id;

    // Scheduled messages must not appear in regular feed yet
    const bobMessages = await request(app)
      .get(`/api/v1/chats/conversations/${directConvId}/messages`)
      .set('Authorization', `Bearer ${bobToken}`);
    const idsBefore = bobMessages.body.data.items.map((m: any) => m.id);
    expect(idsBefore).not.toContain(deliverMsgId);

    // Sender lists scheduled queue and cancels second one
    const queueRes = await request(app)
      .get(`/api/v1/chats/conversations/${directConvId}/scheduled`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(queueRes.body.data.length).toBe(2);

    const cancelDel = await request(app)
      .delete(`/api/v1/chats/scheduled/${cancelMsgId}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(cancelDel.status).toBe(200);

    // Deliver due message when clock reaches scheduledFor
    await Message.findByIdAndUpdate(deliverMsgId, {
      scheduledFor: new Date(Date.now() - 1000),
    });
    const deliveredCount = await chatService.deliverDueScheduledMessages();
    expect(deliveredCount).toBe(1);

    const bobMessagesAfter = await request(app)
      .get(`/api/v1/chats/conversations/${directConvId}/messages`)
      .set('Authorization', `Bearer ${bobToken}`);
    const idsAfter = bobMessagesAfter.body.data.items.map((m: any) => m.id);
    expect(idsAfter).toContain(deliverMsgId);
    expect(idsAfter).not.toContain(cancelMsgId);
  });

  it('supports pin, forward, offline lexicon translate, voice STT notice, and secret reactions', async () => {
    const sendRes = await request(app)
      .post(`/api/v1/chats/conversations/${groupConvId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Hello', contentType: 'text' });
    const msgId = sendRes.body.data.id;

    // Pin
    const pinRes = await request(app)
      .post(`/api/v1/chats/messages/${msgId}/pin`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ pinned: true });
    expect(pinRes.status).toBe(200);
    expect(pinRes.body.data.isPinned).toBe(true);

    // Forward to direct chat
    const fwdRes = await request(app)
      .post(`/api/v1/chats/messages/${msgId}/forward`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ targetConversationIds: [directConvId] });
    expect(fwdRes.status).toBe(201);
    expect(fwdRes.body.data[0].forwardedFrom.senderDisplayName).toBe('Alice Test');

    // Translate
    const trRes = await request(app)
      .post(`/api/v1/chats/messages/${msgId}/translate`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ targetLang: 'es' });
    expect(trRes.status).toBe(200);
    expect(trRes.body.data.translatedText).toBe('hola');

    // Voice transcribe without configured STT URL must return explicit unconfigured notice
    const sttRes = await request(app)
      .post(`/api/v1/chats/messages/${msgId}/transcribe`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(sttRes.status).toBe(200);
    expect(sttRes.body.data.status).toBe('unconfigured');

    // Secret reaction from Bob to Alice's message
    const srRes = await request(app)
      .post(`/api/v1/chats/messages/${msgId}/secret-reactions`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ emoji: '🔥' });
    expect(srRes.status).toBe(200);
    expect(srRes.body.data.secretReactions[0].emoji).toBe('🔥');

    // Masked for Carol, masked for Alice until she reveals
    const carolToken = signToken(carolId, 'carol_test');
    const carolMsgs = await request(app)
      .get(`/api/v1/chats/conversations/${groupConvId}/messages`)
      .set('Authorization', `Bearer ${carolToken}`);
    const carolTarget = carolMsgs.body.data.items.find((m: any) => m.id === msgId);
    expect(carolTarget.secretReactions[0].isRevealed).toBe(false);
    expect(carolTarget.secretReactions[0].emoji).toBe('🔒');

    // Alice (author) reveals secret reaction
    const revealRes = await request(app)
      .post(`/api/v1/chats/messages/${msgId}/secret-reactions/reveal`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(revealRes.status).toBe(200);
    expect(revealRes.body.data.secretReactions[0].isRevealed).toBe(true);
    expect(revealRes.body.data.secretReactions[0].emoji).toBe('🔥');
  });

  it('supports interactive poll, checklist, event RSVP, and task cards', async () => {
    // 1. Poll
    const pollRes = await request(app)
      .post(`/api/v1/chats/conversations/${groupConvId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        contentType: 'poll',
        content: 'Next sprint demo day?',
        interactiveData: {
          kind: 'poll',
          question: 'Next sprint demo day?',
          allowMultiple: false,
          options: [
            { id: 'o1', text: 'Thursday', voterIds: [] },
            { id: 'o2', text: 'Friday', voterIds: [] },
          ],
        },
      });
    expect(pollRes.status).toBe(201);
    const pollMsgId = pollRes.body.data.id;

    const voteRes = await request(app)
      .post(`/api/v1/chats/messages/${pollMsgId}/interact`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ action: 'vote', optionId: 'o2' });
    expect(voteRes.status).toBe(200);
    expect(voteRes.body.data.interactiveData.options[1].voterIds).toContain(bobId);

    // 2. Checklist
    const checkRes = await request(app)
      .post(`/api/v1/chats/conversations/${groupConvId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        contentType: 'checklist',
        content: 'Launch Prep',
        interactiveData: {
          kind: 'checklist',
          question: 'Launch Prep',
          checklistItems: [{ id: 'c1', text: 'Run Jest tests', completed: false }],
        },
      });
    const toggleRes = await request(app)
      .post(`/api/v1/chats/messages/${checkRes.body.data.id}/interact`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ action: 'toggle_checklist', itemId: 'c1' });
    expect(toggleRes.body.data.interactiveData.checklistItems[0].completed).toBe(true);

    // 3. Event RSVP
    const evRes = await request(app)
      .post(`/api/v1/chats/conversations/${groupConvId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        contentType: 'event',
        content: 'Design Review',
        interactiveData: {
          kind: 'event',
          event: {
            title: 'Design Review',
            startsAt: new Date(Date.now() + 86400000).toISOString(),
            location: 'Audio Stage',
            rsvpGoingIds: [],
            rsvpMaybeIds: [],
            rsvpDeclinedIds: [],
          },
        },
      });
    const rsvpRes = await request(app)
      .post(`/api/v1/chats/messages/${evRes.body.data.id}/interact`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ action: 'rsvp', rsvpStatus: 'going' });
    expect(rsvpRes.body.data.interactiveData.event.rsvpGoingIds).toContain(bobId);

    // 4. Task update
    const taskRes = await request(app)
      .post(`/api/v1/chats/conversations/${groupConvId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        contentType: 'task',
        content: 'Ship build',
        interactiveData: {
          kind: 'task',
          task: { title: 'Ship build', assigneeId: bobId, status: 'todo' },
        },
      });
    const taskUpdateRes = await request(app)
      .post(`/api/v1/chats/messages/${taskRes.body.data.id}/interact`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ action: 'update_task', taskStatus: 'done' });
    expect(taskUpdateRes.body.data.interactiveData.task.status).toBe('done');
  });

  it('supports folders, conversation preferences, saved personal collections, and reminders', async () => {
    const folderRes = await request(app)
      .post('/api/v1/chats/folders')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ name: 'Work', color: '#A020F0', conversationIds: [groupConvId] });
    expect(folderRes.status).toBe(201);
    const folderId = folderRes.body.data.id;

    const prefRes = await request(app)
      .patch(`/api/v1/chats/conversations/${directConvId}/preferences`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ isPriority: true, isArchived: false, folderIds: [folderId] });
    expect(prefRes.status).toBe(200);
    expect(prefRes.body.data.isPriority).toBe(true);
    expect(prefRes.body.data.folderIds).toContain(folderId);

    // Create message to bookmark & set reminder on
    const msgRes = await request(app)
      .post(`/api/v1/chats/conversations/${directConvId}/messages`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Important release notes', contentType: 'text' });
    const msgId = msgRes.body.data.id;

    const saveRes = await request(app)
      .post(`/api/v1/chats/messages/${msgId}/save-personal`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ collectionName: 'Release', isImportant: true, note: 'Check Friday' });
    expect(saveRes.status).toBe(201);

    const savedList = await request(app)
      .get('/api/v1/chats/saved-messages?important=true')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(savedList.body.data.some((s: any) => s.messageId === msgId)).toBe(true);

    const remRes = await request(app)
      .post(`/api/v1/chats/messages/${msgId}/reminders`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ remindAt: new Date(Date.now() - 1000).toISOString(), note: 'Follow up now' });
    expect(remRes.status).toBe(201);

    const triggered = await chatService.triggerDueReminders();
    expect(triggered).toBe(1);

    const remList = await request(app)
      .get('/api/v1/chats/reminders')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(remList.body.data[0].status).toBe('triggered');
  });

  it('tracks friend streaks, recovers broken streaks, and enforces monthly recovery limits', async () => {
    const listRes = await request(app)
      .get('/api/v1/chats/streaks')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    const streakId = listRes.body.data[0].id;

    // Simulate a previous 5-day streak that broke 3 days ago
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    await FriendStreak.findByIdAndUpdate(streakId, {
      currentStreak: 1,
      longestStreak: 5,
      lastInteractionDate: threeDaysAgo,
      status: 'broken',
      maxRecoveriesPerMonth: 2,
      recoveries: [],
    });

    const recover1 = await request(app)
      .post(`/api/v1/chats/streaks/${streakId}/recover`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(recover1.status).toBe(200);
    expect(recover1.body.data.currentStreak).toBe(5);
    expect(recover1.body.data.recoveriesUsedThisMonth).toBe(1);

    const recover2 = await request(app)
      .post(`/api/v1/chats/streaks/${streakId}/recover`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(recover2.status).toBe(200);
    expect(recover2.body.data.recoveriesUsedThisMonth).toBe(2);

    // 3rd recovery exceeds maxRecoveriesPerMonth=2
    const recover3 = await request(app)
      .post(`/api/v1/chats/streaks/${streakId}/recover`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(recover3.status).toBeGreaterThanOrEqual(400);

    // Settings update
    const settingsRes = await request(app)
      .patch(`/api/v1/chats/streaks/${streakId}/settings`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ remindersEnabled: true, privacyHidden: false });
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body.data.remindersEnabled).toBe(true);
  });
});

