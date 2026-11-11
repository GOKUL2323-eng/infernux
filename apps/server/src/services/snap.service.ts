import mongoose from 'mongoose';
import { SnapMoment, ISnapMomentDocument } from '../models/SnapMoment';
import { User } from '../models/User';
import { CreateSnapMomentInput, SnapMomentSummary, SOCKET_EVENTS } from '@infernux/shared';
import { getIO } from '../sockets';

export class SnapService {
  private formatSnap(doc: ISnapMomentDocument, viewerId: string): SnapMomentSummary {
    const sender = doc.senderId as any;
    const senderId = sender?._id?.toString() || sender?.toString() || '';
    const hasViewedByMe = doc.viewedByIds.some((id) => id.toString() === viewerId);
    const hasReplayedByMe = doc.replayedByIds.some((id) => id.toString() === viewerId);

    const expiredByView =
      senderId !== viewerId &&
      hasViewedByMe &&
      (!doc.allowReplay || hasReplayedByMe);

    const isExpired = doc.isExpired || doc.expiresAt < new Date() || expiredByView;

    return {
      id: doc._id.toString(),
      senderId,
      sender: {
        id: senderId,
        username: sender?.username || '',
        displayName: sender?.displayName || '',
        avatarUrl: sender?.avatarUrl,
        isVerified: sender?.isVerified,
      },
      recipientIds: doc.recipientIds.map((id) => id.toString()),
      mediaType: doc.mediaType,
      mediaUrl: isExpired && senderId !== viewerId ? '' : doc.mediaUrl,
      caption: doc.caption,
      filter: doc.filter,
      overlays: doc.overlays || [],
      disappearingSeconds: doc.disappearingSeconds,
      allowReplay: doc.allowReplay,
      replayedByIds: doc.replayedByIds.map((id) => id.toString()),
      viewedByIds: doc.viewedByIds.map((id) => id.toString()),
      screenshotAlerts: (doc.screenshotAlerts || []).map((a) => ({
        userId: a.userId.toString(),
        username: a.username,
        detectedAt: a.detectedAt.toISOString(),
      })),
      hasViewedByMe,
      hasReplayedByMe,
      isExpired,
      expiresAt: doc.expiresAt.toISOString(),
      createdAt: doc.createdAt.toISOString(),
    };
  }

  async sendSnap(senderId: string, input: CreateSnapMomentInput): Promise<SnapMomentSummary> {
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    const snap = new SnapMoment({
      senderId,
      recipientIds: input.recipientIds,
      mediaType: input.mediaType,
      mediaUrl: input.mediaUrl,
      caption: input.caption,
      filter: input.filter,
      overlays: input.overlays,
      disappearingSeconds: input.disappearingSeconds,
      allowReplay: input.allowReplay,
      expiresAt,
    });
    await snap.save();
    await snap.populate('senderId', 'username displayName avatarUrl isVerified');

    const summary = this.formatSnap(snap, senderId);
    const io = getIO();
    if (io) {
      for (const rId of input.recipientIds) {
        io.to(`user:${rId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
          type: 'snap_moment',
          snapId: summary.id,
          senderId,
          senderUsername: summary.sender.username,
        });
      }
    }

    return summary;
  }

  async getInbox(userId: string): Promise<SnapMomentSummary[]> {
    const snaps = await SnapMoment.find({
      recipientIds: userId,
      isExpired: false,
      expiresAt: { $gt: new Date() },
    })
      .populate('senderId', 'username displayName avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .limit(50);

    return snaps.map((s) => this.formatSnap(s, userId));
  }

  async getSent(userId: string): Promise<SnapMomentSummary[]> {
    const snaps = await SnapMoment.find({ senderId: userId })
      .populate('senderId', 'username displayName avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .limit(50);

    return snaps.map((s) => this.formatSnap(s, userId));
  }

  async openSnap(snapId: string, userId: string): Promise<SnapMomentSummary> {
    const snap = await SnapMoment.findById(snapId).populate(
      'senderId',
      'username displayName avatarUrl isVerified'
    );
    if (!snap) throw new Error('Snap not found');

    const isRecipient = snap.recipientIds.some((id) => id.toString() === userId);
    const isSender = snap.senderId._id
      ? snap.senderId._id.toString() === userId
      : snap.senderId.toString() === userId;

    if (!isRecipient && !isSender) throw new Error('Access denied');

    if (isRecipient && !snap.viewedByIds.some((id) => id.toString() === userId)) {
      snap.viewedByIds.push(new mongoose.Types.ObjectId(userId));
      await snap.save();
    }

    return this.formatSnap(snap, userId);
  }

  async replaySnap(snapId: string, userId: string): Promise<SnapMomentSummary> {
    const snap = await SnapMoment.findById(snapId).populate(
      'senderId',
      'username displayName avatarUrl isVerified'
    );
    if (!snap) throw new Error('Snap not found');

    const isRecipient = snap.recipientIds.some((id) => id.toString() === userId);
    if (!isRecipient) throw new Error('Only recipients can replay a Snap');
    if (!snap.allowReplay) throw new Error('Replay is disabled for this Snap');
    if (snap.replayedByIds.some((id) => id.toString() === userId)) {
      throw new Error('You have already used your replay for this Snap');
    }

    snap.replayedByIds.push(new mongoose.Types.ObjectId(userId));
    await snap.save();

    return this.formatSnap(snap, userId);
  }

  async reportScreenshot(snapId: string, userId: string): Promise<SnapMomentSummary> {
    const snap = await SnapMoment.findById(snapId).populate(
      'senderId',
      'username displayName avatarUrl isVerified'
    );
    if (!snap) throw new Error('Snap not found');

    const userDoc = await User.findById(userId).select('username');
    snap.screenshotAlerts.push({
      userId: new mongoose.Types.ObjectId(userId),
      username: userDoc?.username || 'user',
      detectedAt: new Date(),
    });
    await snap.save();

    return this.formatSnap(snap, userId);
  }
}

export const snapService = new SnapService();

