import mongoose from 'mongoose';
import { FriendStreak, IFriendStreakDocument } from '../models/FriendStreak';
import { IConversationDocument } from '../models/Conversation';
import { FriendStreakSummary, SOCKET_EVENTS } from '@infernux/shared';
import { getIO } from '../sockets';

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function diffUtcDays(fromKey: string, toKey: string): number {
  const fromMs = Date.parse(`${fromKey}T00:00:00.000Z`);
  const toMs = Date.parse(`${toKey}T00:00:00.000Z`);
  return Math.round((toMs - fromMs) / 86400000);
}

function buildPairKey(userA: string, userB: string): { key: string; sorted: [string, string] } {
  const sorted = [userA, userB].sort() as [string, string];
  return { key: `${sorted[0]}:${sorted[1]}`, sorted };
}

export class StreakService {
  formatStreak(doc: IFriendStreakDocument, viewerId: string, now = new Date()): FriendStreakSummary {
    const todayKey = toUtcDateKey(now);
    const monthKey = toMonthKey(now);
    const partnerId =
      doc.userIds.find((id) => id.toString() !== viewerId)?.toString() || doc.userIds[0].toString();

    let status: 'active' | 'at_risk' | 'broken' = doc.status;
    if (doc.lastInteractionDate) {
      const gap = diffUtcDays(doc.lastInteractionDate, todayKey);
      if (gap >= 2) {
        status = 'broken';
      } else if (gap === 1) {
        status = 'at_risk';
      } else {
        status = 'active';
      }
    }

    const recoveryRecord = doc.recoveries.find(
      (r) => r.userId.toString() === viewerId && r.monthKey === monthKey
    );

    return {
      id: doc._id.toString(),
      partnerId,
      currentStreak: doc.currentStreak,
      longestStreak: doc.longestStreak,
      lastInteractionDate: doc.lastInteractionDate,
      status,
      remindersEnabled: doc.remindersEnabledBy.some((id) => id.toString() === viewerId),
      privacyHidden: doc.hiddenBy.some((id) => id.toString() === viewerId),
      recoveriesUsedThisMonth: recoveryRecord?.count || 0,
      maxRecoveriesPerMonth: doc.maxRecoveriesPerMonth,
      lastRecoveredAt: doc.lastRecoveredAt?.toISOString(),
    };
  }

  async recordDirectInteraction(
    senderId: string,
    conversation: IConversationDocument,
    now = new Date()
  ): Promise<FriendStreakSummary | null> {
    if (conversation.type !== 'direct' || conversation.participants.length !== 2) {
      return null;
    }

    const pIds = conversation.participants.map((p) => p.toString());
    const otherId = pIds.find((id) => id !== senderId);
    if (!otherId) return null;

    const { key, sorted } = buildPairKey(senderId, otherId);
    const todayKey = toUtcDateKey(now);

    let streak = await FriendStreak.findOne({ userPairKey: key });
    if (!streak) {
      streak = new FriendStreak({
        userPairKey: key,
        userIds: sorted.map((id) => new mongoose.Types.ObjectId(id)),
        currentStreak: 1,
        longestStreak: 1,
        lastInteractionDate: todayKey,
        lastMessageAt: now,
        status: 'active',
        remindersEnabledBy: [],
        hiddenBy: [],
        recoveries: [],
        maxRecoveriesPerMonth: 3,
      });
      await streak.save();
    } else {
      const prevDate = streak.lastInteractionDate;
      const gap = prevDate ? diffUtcDays(prevDate, todayKey) : 999;

      if (gap === 0) {
        // Same UTC day: keep streak active
        streak.status = 'active';
        streak.lastMessageAt = now;
      } else if (gap === 1) {
        streak.currentStreak += 1;
        streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
        streak.lastInteractionDate = todayKey;
        streak.lastMessageAt = now;
        streak.status = 'active';
      } else {
        // Streak lapsed; restart at 1 today while keeping longestStreak intact
        streak.currentStreak = 1;
        streak.longestStreak = Math.max(streak.longestStreak, 1);
        streak.lastInteractionDate = todayKey;
        streak.lastMessageAt = now;
        streak.status = 'active';
      }
      await streak.save();
    }

    const io = getIO();
    if (io) {
      for (const uid of sorted) {
        const dto = this.formatStreak(streak, uid, now);
        if (!dto.privacyHidden) {
          io.to(`user:${uid}`).emit(SOCKET_EVENTS.STREAK_UPDATED, dto);
        }
      }
    }

    return this.formatStreak(streak, senderId, now);
  }

  async getUserStreaks(userId: string): Promise<FriendStreakSummary[]> {
    const docs = await FriendStreak.find({ userIds: userId }).sort({ currentStreak: -1, updatedAt: -1 });
    return docs.map((d) => this.formatStreak(d, userId));
  }

  async getStreakMapByPartner(userId: string): Promise<Map<string, FriendStreakSummary>> {
    const streaks = await this.getUserStreaks(userId);
    const map = new Map<string, FriendStreakSummary>();
    for (const s of streaks) {
      if (!s.privacyHidden) {
        map.set(s.partnerId, s);
      }
    }
    return map;
  }

  async recoverStreak(streakId: string, userId: string): Promise<FriendStreakSummary> {
    const doc = await FriendStreak.findOne({ _id: streakId, userIds: userId });
    if (!doc) {
      throw new Error('Streak not found');
    }

    const now = new Date();
    const monthKey = toMonthKey(now);
    const existingRecovery = doc.recoveries.find(
      (r) => r.userId.toString() === userId && r.monthKey === monthKey
    );
    const usedCount = existingRecovery?.count || 0;

    if (usedCount >= doc.maxRecoveriesPerMonth) {
      throw new Error(
        `Monthly streak recovery limit reached (${doc.maxRecoveriesPerMonth} per month)`
      );
    }

    // Restore from longestStreak if broken/reset down to <= 1, or extend +1
    const restoredValue =
      doc.currentStreak <= 1 && doc.longestStreak > 1
        ? doc.longestStreak
        : Math.max(1, doc.currentStreak);

    doc.currentStreak = restoredValue;
    doc.longestStreak = Math.max(doc.longestStreak, restoredValue);
    doc.lastInteractionDate = toUtcDateKey(now);
    doc.status = 'active';
    doc.lastRecoveredAt = now;

    if (existingRecovery) {
      existingRecovery.count += 1;
    } else {
      doc.recoveries.push({
        userId: new mongoose.Types.ObjectId(userId),
        monthKey,
        count: 1,
      });
    }

    await doc.save();

    const io = getIO();
    if (io) {
      for (const participantId of doc.userIds) {
        const uid = participantId.toString();
        const dto = this.formatStreak(doc, uid, now);
        io.to(`user:${uid}`).emit(SOCKET_EVENTS.STREAK_UPDATED, dto);
      }
    }

    return this.formatStreak(doc, userId, now);
  }

  async updateSettings(
    streakId: string,
    userId: string,
    settings: { remindersEnabled?: boolean; privacyHidden?: boolean }
  ): Promise<FriendStreakSummary> {
    const doc = await FriendStreak.findOne({ _id: streakId, userIds: userId });
    if (!doc) {
      throw new Error('Streak not found');
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    if (typeof settings.remindersEnabled === 'boolean') {
      doc.remindersEnabledBy = doc.remindersEnabledBy.filter((id) => id.toString() !== userId);
      if (settings.remindersEnabled) {
        doc.remindersEnabledBy.push(userObjectId);
      }
    }

    if (typeof settings.privacyHidden === 'boolean') {
      doc.hiddenBy = doc.hiddenBy.filter((id) => id.toString() !== userId);
      if (settings.privacyHidden) {
        doc.hiddenBy.push(userObjectId);
      }
    }

    await doc.save();
    return this.formatStreak(doc, userId);
  }
}

export const streakService = new StreakService();

