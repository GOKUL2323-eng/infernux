import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { MemoryCapsule, IMemoryCapsuleDocument } from '../models/MemoryCapsule';
import { MoodEntry, IMoodEntryDocument } from '../models/MoodEntry';
import { TogetherSession, ITogetherSessionDocument } from '../models/TogetherSession';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import {
  CreateMemoryCapsuleInput,
  CreateMoodEntryInput,
  CreateTogetherSessionInput,
  GuestbookEntry,
  MemoryCapsuleSummary,
  MoodEntrySummary,
  SignGuestbookInput,
  SOCKET_EVENTS,
  SyncTogetherStateInput,
  TogetherSessionSummary,
  UpdateInteractiveProfileInput,
  UpdateSmartPresenceInput,
  UserProfile,
} from '@infernux/shared';
import { getIO } from '../sockets';

export class ExperienceService {
  private formatCapsule(doc: IMemoryCapsuleDocument): MemoryCapsuleSummary {
    const creator = doc.creatorId as any;
    const creatorId = creator?._id?.toString() || creator?.toString() || '';
    const isUnlocked = doc.unlockAt.getTime() <= Date.now();
    return {
      id: doc._id.toString(),
      creatorId,
      creator: {
        id: creatorId,
        username: creator?.username || '',
        displayName: creator?.displayName || '',
        avatarUrl: creator?.avatarUrl,
        isVerified: creator?.isVerified,
      },
      recipientIds: doc.recipientIds.map((id) => id.toString()),
      title: doc.title,
      message: isUnlocked ? doc.message : 'Locked until unlock date arrives.',
      mediaUrls: isUnlocked ? doc.mediaUrls : [],
      unlockAt: doc.unlockAt.toISOString(),
      isUnlocked,
      unlockedNotified: doc.unlockedNotified,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  private formatMood(doc: IMoodEntryDocument): MoodEntrySummary {
    const u = doc.userId as any;
    const userId = u?._id?.toString() || u?.toString() || '';
    return {
      id: doc._id.toString(),
      userId,
      user: {
        id: userId,
        username: u?.username || '',
        displayName: u?.displayName || '',
        avatarUrl: u?.avatarUrl,
        isVerified: u?.isVerified,
      },
      mood: doc.mood,
      emoji: doc.emoji,
      note: doc.note,
      colorHex: doc.colorHex,
      isPublic: doc.isPublic,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  private formatTogether(doc: ITogetherSessionDocument): TogetherSessionSummary {
    const host = doc.hostId as any;
    const hostId = host?._id?.toString() || host?.toString() || '';
    const participantsRaw = (doc.participantIds as any[]) || [];
    const participants = participantsRaw.map((p) => {
      const pid = p?._id?.toString() || p?.toString() || '';
      return {
        id: pid,
        username: p?.username || '',
        displayName: p?.displayName || '',
        avatarUrl: p?.avatarUrl,
        isVerified: p?.isVerified,
      };
    });

    return {
      id: doc._id.toString(),
      hostId,
      host: {
        id: hostId,
        username: host?.username || '',
        displayName: host?.displayName || '',
        avatarUrl: host?.avatarUrl,
        isVerified: host?.isVerified,
      },
      title: doc.title,
      sessionType: doc.sessionType,
      mediaUrl: doc.mediaUrl,
      trackTitle: doc.trackTitle,
      playbackPositionSec: doc.playbackPositionSec,
      isPlaying: doc.isPlaying,
      participantIds: participants.map((p) => p.id),
      participants,
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  // --- MEMORY CAPSULES ---
  async createCapsule(
    creatorId: string,
    input: CreateMemoryCapsuleInput
  ): Promise<MemoryCapsuleSummary> {
    const unlockDate = new Date(input.unlockAt);
    if (Number.isNaN(unlockDate.getTime())) {
      throw new Error('Invalid unlockAt timestamp');
    }

    const capsule = new MemoryCapsule({
      creatorId,
      recipientIds: input.recipientIds.map((id) => new mongoose.Types.ObjectId(id)),
      title: input.title,
      message: input.message,
      mediaUrls: input.mediaUrls || [],
      unlockAt: unlockDate,
      unlockedNotified: unlockDate.getTime() <= Date.now(),
    });
    await capsule.save();
    await capsule.populate('creatorId', 'username displayName avatarUrl isVerified');
    return this.formatCapsule(capsule);
  }

  async listCapsules(userId: string): Promise<MemoryCapsuleSummary[]> {
    const docs = await MemoryCapsule.find({
      $or: [{ creatorId: userId }, { recipientIds: userId }],
    })
      .populate('creatorId', 'username displayName avatarUrl isVerified')
      .sort({ unlockAt: 1 })
      .limit(60);

    return docs.map((d) => this.formatCapsule(d));
  }

  async unlockDueCapsules(): Promise<number> {
    const now = new Date();
    const dueDocs = await MemoryCapsule.find({
      unlockedNotified: false,
      unlockAt: { $lte: now },
    }).populate('creatorId', 'username displayName avatarUrl isVerified');

    if (dueDocs.length === 0) return 0;

    const io = getIO();
    for (const cap of dueDocs) {
      cap.unlockedNotified = true;
      await cap.save();
      const summary = this.formatCapsule(cap);
      if (io) {
        const targets = new Set<string>([
          summary.creatorId,
          ...summary.recipientIds,
        ]);
        for (const uid of targets) {
          io.to(`user:${uid}`).emit(SOCKET_EVENTS.CAPSULE_UNLOCKED, summary);
        }
      }
    }
    return dueDocs.length;
  }

  // --- MOODSPACE ---
  async logMood(userId: string, input: CreateMoodEntryInput): Promise<MoodEntrySummary> {
    const entry = new MoodEntry({
      userId,
      mood: input.mood,
      emoji: input.emoji,
      note: input.note,
      colorHex: input.colorHex,
      isPublic: input.isPublic,
    });
    await entry.save();
    await entry.populate('userId', 'username displayName avatarUrl isVerified');
    return this.formatMood(entry);
  }

  async getMyMoods(userId: string): Promise<{ entries: MoodEntrySummary[]; counts: Record<string, number> }> {
    const docs = await MoodEntry.find({ userId })
      .populate('userId', 'username displayName avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .limit(50);

    const counts: Record<string, number> = {};
    for (const doc of docs) {
      counts[doc.mood] = (counts[doc.mood] || 0) + 1;
    }

    return {
      entries: docs.map((d) => this.formatMood(d)),
      counts,
    };
  }

  async getMoodFeed(userId: string): Promise<MoodEntrySummary[]> {
    const follows = await Follow.find({ followerId: userId, status: 'accepted' }).select('followingId');
    const visibleUserIds = [userId, ...follows.map((f) => f.followingId.toString())];

    const docs = await MoodEntry.find({
      userId: { $in: visibleUserIds },
      isPublic: true,
    })
      .populate('userId', 'username displayName avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .limit(40);

    return docs.map((d) => this.formatMood(d));
  }

  // --- TOGETHER MODE ---
  async createTogetherSession(
    hostId: string,
    input: CreateTogetherSessionInput
  ): Promise<TogetherSessionSummary> {
    const session = new TogetherSession({
      hostId,
      title: input.title,
      sessionType: input.sessionType,
      mediaUrl: input.mediaUrl,
      trackTitle: input.trackTitle,
      participantIds: [new mongoose.Types.ObjectId(hostId)],
      status: 'active',
    });
    await session.save();
    await session.populate('hostId', 'username displayName avatarUrl isVerified');
    await session.populate('participantIds', 'username displayName avatarUrl isVerified');
    return this.formatTogether(session);
  }

  async listTogetherSessions(): Promise<TogetherSessionSummary[]> {
    const docs = await TogetherSession.find({ status: 'active' })
      .populate('hostId', 'username displayName avatarUrl isVerified')
      .populate('participantIds', 'username displayName avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .limit(30);
    return docs.map((d) => this.formatTogether(d));
  }

  async joinTogetherSession(sessionId: string, userId: string): Promise<TogetherSessionSummary> {
    const session = await TogetherSession.findById(sessionId);
    if (!session) throw new Error('Together session not found');
    if (session.status !== 'active') throw new Error('Together session has ended');

    if (!session.participantIds.some((id) => id.toString() === userId)) {
      session.participantIds.push(new mongoose.Types.ObjectId(userId));
      await session.save();
    }
    await session.populate('hostId', 'username displayName avatarUrl isVerified');
    await session.populate('participantIds', 'username displayName avatarUrl isVerified');

    const summary = this.formatTogether(session);
    const io = getIO();
    if (io) {
      io.to(`together:${summary.id}`).emit(SOCKET_EVENTS.TOGETHER_STATE, summary);
    }
    return summary;
  }

  async syncTogetherState(
    sessionId: string,
    userId: string,
    input: SyncTogetherStateInput
  ): Promise<TogetherSessionSummary> {
    const session = await TogetherSession.findById(sessionId);
    if (!session) throw new Error('Together session not found');
    if (session.status !== 'active') throw new Error('Together session has ended');

    const isParticipant = session.participantIds.some((id) => id.toString() === userId);
    if (!isParticipant && session.hostId.toString() !== userId) {
      throw new Error('Join the Together session before controlling playback');
    }

    session.playbackPositionSec = input.playbackPositionSec;
    session.isPlaying = input.isPlaying;
    if (input.mediaUrl) session.mediaUrl = input.mediaUrl;
    if (input.trackTitle) session.trackTitle = input.trackTitle;
    await session.save();

    await session.populate('hostId', 'username displayName avatarUrl isVerified');
    await session.populate('participantIds', 'username displayName avatarUrl isVerified');

    const summary = this.formatTogether(session);
    const io = getIO();
    if (io) {
      io.to(`together:${summary.id}`).emit(SOCKET_EVENTS.TOGETHER_STATE, summary);
    }
    return summary;
  }

  async endTogetherSession(sessionId: string, hostId: string): Promise<TogetherSessionSummary> {
    const session = await TogetherSession.findById(sessionId);
    if (!session) throw new Error('Together session not found');
    if (session.hostId.toString() !== hostId) {
      throw new Error('Only the host can end the Together session');
    }
    session.status = 'ended';
    session.isPlaying = false;
    await session.save();
    await session.populate('hostId', 'username displayName avatarUrl isVerified');
    await session.populate('participantIds', 'username displayName avatarUrl isVerified');

    const summary = this.formatTogether(session);
    const io = getIO();
    if (io) {
      io.to(`together:${summary.id}`).emit(SOCKET_EVENTS.TOGETHER_STATE, summary);
    }
    return summary;
  }

  // --- SMART PRESENCE & INTERACTIVE PROFILE ---
  async updateSmartPresence(
    userId: string,
    input: UpdateSmartPresenceInput
  ): Promise<UserProfile> {
    const focusModeUntil =
      input.statusMode === 'focus' && input.focusDurationMinutes && input.focusDurationMinutes > 0
        ? new Date(Date.now() + input.focusDurationMinutes * 60_000)
        : undefined;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        statusMode: input.statusMode,
        customStatusText: input.customStatusText,
        focusModeUntil,
      },
      { new: true }
    );
    if (!user) throw new Error('User not found');

    const io = getIO();
    if (io) {
      io.emit(SOCKET_EVENTS.USER_STATUS_CHANGE, {
        userId,
        statusMode: user.statusMode,
        customStatusText: user.customStatusText,
      });
    }
    return user.toProfileJSON();
  }

  async updateInteractiveProfile(
    userId: string,
    input: UpdateInteractiveProfileInput
  ): Promise<UserProfile> {
    const update: any = {};
    if (input.profileThemeAccent !== undefined) update.profileThemeAccent = input.profileThemeAccent;
    if (input.featuredSongTitle !== undefined) update.featuredSongTitle = input.featuredSongTitle;
    if (input.profilePrompts !== undefined) update.profilePrompts = input.profilePrompts;

    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!user) throw new Error('User not found');
    return user.toProfileJSON();
  }

  async signGuestbook(
    targetUserId: string,
    authorId: string,
    input: SignGuestbookInput
  ): Promise<GuestbookEntry[]> {
    const [targetUser, authorUser] = await Promise.all([
      User.findById(targetUserId),
      User.findById(authorId).select('username'),
    ]);
    if (!targetUser) throw new Error('Profile user not found');

    const entry: GuestbookEntry = {
      id: uuidv4(),
      authorId,
      authorUsername: authorUser?.username || 'user',
      emoji: input.emoji,
      note: input.note,
      createdAt: new Date().toISOString(),
    };
    const existing = Array.isArray(targetUser.guestbookEntries) ? targetUser.guestbookEntries : [];
    targetUser.guestbookEntries = [entry, ...existing].slice(0, 50);
    await targetUser.save();
    return targetUser.guestbookEntries;
  }
}

export const experienceService = new ExperienceService();
