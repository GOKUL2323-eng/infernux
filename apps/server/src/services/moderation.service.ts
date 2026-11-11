import mongoose from 'mongoose';
import {
  CreateAppealInput,
  CreateReportInput,
  ModerationLogSummary,
  ModerationReport,
  ResolveReportInput,
  ReviewAppealInput,
  SuspendUserInput,
  SuspensionAppealSummary,
  UpdateAccountRoleInput,
  UserProfile,
} from '@infernux/shared';
import { Report, IReportDocument } from '../models/Report';
import { User, IUserDocument } from '../models/User';
import { Session } from '../models/Session';
import { ModerationLog } from '../models/ModerationLog';
import { SuspensionAppeal } from '../models/SuspensionAppeal';
import { Post } from '../models/Post';
import { Reel } from '../models/Reel';
import { Story } from '../models/Story';
import { SocialNote } from '../models/SocialNote';
import { Message } from '../models/Message';
import { CommunityPost } from '../models/CommunityPost';

const SPAM_PHRASE_REGEX =
  /\b(guaranteed profit|free crypto|double your money|click here to win|whatsapp me now|dm for quick cash)\b/i;

export function detectSpamSignal(text: string): {
  isFlagged: boolean;
  score: number;
  matchedSignals: string[];
} {
  const cleaned = (text || '').trim();
  if (!cleaned) {
    return { isFlagged: false, score: 0, matchedSignals: [] };
  }

  const matchedSignals: string[] = [];
  let score = 0;

  if (SPAM_PHRASE_REGEX.test(cleaned)) {
    matchedSignals.push('spam_phrase');
    score += 0.6;
  }
  const urlMatches = cleaned.match(/https?:\/\/\S+/gi) || [];
  if (urlMatches.length >= 3) {
    matchedSignals.push('excessive_links');
    score += 0.4;
  }
  if (/(.)\1{6,}/.test(cleaned)) {
    matchedSignals.push('character_flood');
    score += 0.3;
  }
  const letters = cleaned.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 16) {
    const upperCount = letters.replace(/[^A-Z]/g, '').length;
    if (upperCount / letters.length > 0.85) {
      matchedSignals.push('excessive_caps');
      score += 0.25;
    }
  }

  return {
    isFlagged: score >= 0.6,
    score: Math.min(1, Number(score.toFixed(2))),
    matchedSignals,
  };
}

export class ModerationService {
  private mapReport(report: IReportDocument): ModerationReport {
    return {
      id: report._id.toString(),
      reporterId: report.reporterId.toString(),
      targetType: report.targetType,
      targetId: report.targetId.toString(),
      reason: report.reason,
      description: report.description,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    };
  }

  private async requireModeratorOrAdmin(actorId: string): Promise<IUserDocument> {
    const actor = await User.findById(actorId);
    if (!actor) {
      throw new Error('User not found');
    }
    if (actor.role !== 'moderator' && actor.role !== 'admin') {
      throw new Error('Access denied: Moderator or Admin role required');
    }
    return actor;
  }

  private async requireAdmin(actorId: string): Promise<IUserDocument> {
    const actor = await User.findById(actorId);
    if (!actor) {
      throw new Error('User not found');
    }
    if (actor.role !== 'admin') {
      throw new Error('Access denied: Admin role required');
    }
    return actor;
  }

  async submitReport(reporterId: string, input: CreateReportInput): Promise<ModerationReport> {
    const report = new Report({
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      description: input.description,
    });
    await report.save();
    return this.mapReport(report);
  }

  async listReports(
    actorId: string,
    status?: string,
    page = 1,
    limit = 25
  ): Promise<ModerationReport[]> {
    await this.requireModeratorOrAdmin(actorId);

    const filter: Record<string, unknown> = {};
    if (status && ['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      filter.status = status;
    }

    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return reports.map((r) => this.mapReport(r));
  }

  async resolveReport(
    actorId: string,
    reportId: string,
    input: ResolveReportInput
  ): Promise<ModerationReport & { contentRemoved: boolean }> {
    await this.requireModeratorOrAdmin(actorId);

    const report = await Report.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    report.status = input.status;
    if (input.status === 'resolved' || input.status === 'dismissed') {
      report.resolvedAt = new Date();
    }
    await report.save();

    let contentRemoved = false;
    if (input.removeTargetContent) {
      if (report.targetType === 'post') {
        const deleted = await Post.findByIdAndDelete(report.targetId);
        if (deleted) {
          contentRemoved = true;
          await User.findByIdAndUpdate(deleted.authorId, { $inc: { postsCount: -1 } }).catch(
            () => undefined
          );
        } else {
          const deletedCommunityPost = await CommunityPost.findByIdAndDelete(report.targetId);
          contentRemoved = Boolean(deletedCommunityPost);
        }
      } else if (report.targetType === 'reel') {
        const deleted = await Reel.findByIdAndDelete(report.targetId);
        if (deleted) {
          contentRemoved = true;
          await User.findByIdAndUpdate(deleted.creatorId, { $inc: { reelsCount: -1 } }).catch(
            () => undefined
          );
        }
      } else if (report.targetType === 'story') {
        const updated = await Story.findByIdAndUpdate(report.targetId, { isExpired: true });
        contentRemoved = Boolean(updated);
      } else if (report.targetType === 'social_note') {
        const deleted = await SocialNote.findByIdAndDelete(report.targetId);
        contentRemoved = Boolean(deleted);
      } else if (report.targetType === 'message') {
        const updated = await Message.findByIdAndUpdate(report.targetId, {
          isDeleted: true,
          content: '[Removed by moderation]',
        });
        contentRemoved = Boolean(updated);
      }

      if (contentRemoved) {
        await ModerationLog.create({
          actorId,
          action: 'content_removed',
          targetType: report.targetType,
          targetId: report.targetId,
          reason: input.actionNote || report.reason,
        });
      }
    }

    await ModerationLog.create({
      actorId,
      action: `report_${input.status}`,
      targetType: 'report',
      targetId: report._id,
      reason: input.actionNote || report.reason,
    });

    return {
      ...this.mapReport(report),
      contentRemoved,
    };
  }

  async suspendUser(
    actorId: string,
    targetUserId: string,
    input: SuspendUserInput
  ): Promise<UserProfile> {
    const actor = await this.requireModeratorOrAdmin(actorId);
    if (actorId === targetUserId) {
      throw new Error('Permission denied: Cannot suspend your own account');
    }

    const target = await User.findById(targetUserId);
    if (!target) {
      throw new Error('Target user not found');
    }

    if (target.role === 'admin' && actor.role !== 'admin') {
      throw new Error('Permission denied: Moderators cannot suspend admin accounts');
    }

    target.isSuspended = input.suspend;
    target.suspendedReason = input.suspend
      ? input.reason?.trim() || 'Suspended by platform moderation'
      : undefined;
    await target.save();

    if (input.suspend) {
      await Session.updateMany(
        { userId: target._id, isRevoked: false },
        { $set: { isRevoked: true } }
      );
    }

    await ModerationLog.create({
      actorId,
      action: input.suspend ? 'user_suspended' : 'user_unsuspended',
      targetType: 'user',
      targetId: target._id,
      reason: target.suspendedReason || input.reason,
    });

    return target.toProfileJSON();
  }

  async updateUserRole(
    actorId: string,
    targetUserId: string,
    input: UpdateAccountRoleInput
  ): Promise<UserProfile> {
    await this.requireAdmin(actorId);

    const target = await User.findById(targetUserId);
    if (!target) {
      throw new Error('Target user not found');
    }

    target.role = input.role;
    await target.save();

    await ModerationLog.create({
      actorId,
      action: 'role_updated',
      targetType: 'user',
      targetId: target._id,
      reason: `Updated role to ${input.role}`,
    });

    return target.toProfileJSON();
  }

  async listModerationLogs(actorId: string, page = 1, limit = 40): Promise<ModerationLogSummary[]> {
    await this.requireModeratorOrAdmin(actorId);

    const logs = await ModerationLog.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actorId', 'username');

    return logs.map((log) => {
      const actor = log.actorId as any;
      return {
        id: log._id.toString(),
        actorId: actor?._id?.toString?.() || log.actorId.toString(),
        actorUsername: actor?.username || 'staff',
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId.toString(),
        reason: log.reason,
        createdAt: log.createdAt.toISOString(),
      };
    });
  }

  async submitAppeal(userId: string, input: CreateAppealInput): Promise<SuspensionAppealSummary> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (!user.isSuspended) {
      throw new Error('Account is not currently suspended');
    }

    const existingPending = await SuspensionAppeal.findOne({ userId, status: 'pending' });
    if (existingPending) {
      existingPending.reason = input.reason.trim();
      existingPending.details = input.details?.trim();
      await existingPending.save();
      return {
        id: existingPending._id.toString(),
        userId: user._id.toString(),
        username: user.username,
        reason: existingPending.reason,
        details: existingPending.details,
        status: existingPending.status,
        reviewerNotes: existingPending.reviewerNotes,
        createdAt: existingPending.createdAt.toISOString(),
        resolvedAt: existingPending.resolvedAt?.toISOString(),
      };
    }

    const appeal = await SuspensionAppeal.create({
      userId: user._id,
      reason: input.reason.trim(),
      details: input.details?.trim(),
      status: 'pending',
    });

    return {
      id: appeal._id.toString(),
      userId: user._id.toString(),
      username: user.username,
      reason: appeal.reason,
      details: appeal.details,
      status: appeal.status,
      createdAt: appeal.createdAt.toISOString(),
    };
  }

  async listAppeals(actorId: string): Promise<SuspensionAppealSummary[]> {
    const actor = await User.findById(actorId);
    if (!actor) {
      throw new Error('User not found');
    }

    const isStaff = actor.role === 'moderator' || actor.role === 'admin';
    const query = isStaff ? {} : { userId: actor._id };

    const appeals = await SuspensionAppeal.find(query)
      .sort({ createdAt: -1 })
      .limit(40)
      .populate('userId', 'username');

    return appeals.map((a) => {
      const targetUser = a.userId as any;
      return {
        id: a._id.toString(),
        userId: targetUser?._id?.toString?.() || a.userId.toString(),
        username: targetUser?.username || 'user',
        reason: a.reason,
        details: a.details,
        status: a.status,
        reviewerNotes: a.reviewerNotes,
        createdAt: a.createdAt.toISOString(),
        resolvedAt: a.resolvedAt?.toISOString(),
      };
    });
  }

  async reviewAppeal(
    actorId: string,
    appealId: string,
    input: ReviewAppealInput
  ): Promise<SuspensionAppealSummary> {
    await this.requireModeratorOrAdmin(actorId);

    const appeal = await SuspensionAppeal.findById(appealId).populate('userId', 'username');
    if (!appeal) {
      throw new Error('Suspension appeal not found');
    }

    appeal.status = input.status;
    appeal.reviewerId = new mongoose.Types.ObjectId(actorId);
    appeal.reviewerNotes = input.reviewerNotes?.trim();
    appeal.resolvedAt = new Date();
    await appeal.save();

    const targetUserId = (appeal.userId as any)?._id?.toString?.() || appeal.userId.toString();

    if (input.status === 'approved') {
      await User.findByIdAndUpdate(targetUserId, {
        $set: { isSuspended: false },
        $unset: { suspendedReason: 1 },
      });
    }

    await ModerationLog.create({
      actorId,
      action: `appeal_${input.status}`,
      targetType: 'appeal',
      targetId: appeal._id,
      reason: input.reviewerNotes || appeal.reason,
    });

    const targetUser = appeal.userId as any;
    return {
      id: appeal._id.toString(),
      userId: targetUserId,
      username: targetUser?.username || 'user',
      reason: appeal.reason,
      details: appeal.details,
      status: appeal.status,
      reviewerNotes: appeal.reviewerNotes,
      createdAt: appeal.createdAt.toISOString(),
      resolvedAt: appeal.resolvedAt?.toISOString(),
    };
  }
}

export const moderationService = new ModerationService();
