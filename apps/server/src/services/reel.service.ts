import mongoose from 'mongoose';
import { Reel, IReelDocument } from '../models/Reel';
import { ReelComment } from '../models/ReelComment';
import { Like } from '../models/Like';
import { SavedItem } from '../models/SavedItem';
import { Follow } from '../models/Follow';
import { User } from '../models/User';
import { CreateReelInput, ReelSummary, PaginatedResponse } from '@infernux/shared';

export class ReelService {
  async createReel(creatorId: string, input: CreateReelInput): Promise<ReelSummary> {
    let hashtags = input.hashtags || [];
    if (input.caption && hashtags.length === 0) {
      const matched = input.caption.match(/#[a-zA-Z0-9_]+/g);
      if (matched) {
        hashtags = matched.map((tag) => tag.slice(1).toLowerCase());
      }
    }

    const status = input.status || 'published';
    const scheduledFor =
      status === 'scheduled' && input.scheduledFor ? new Date(input.scheduledFor) : undefined;
    const collabInvites = (input.collaboratorIds || [])
      .filter((id) => id !== creatorId)
      .map((id) => ({ userId: new mongoose.Types.ObjectId(id), status: 'pending' as const }));

    const reel = new Reel({
      creatorId,
      videoUrl: input.videoUrl,
      thumbnailUrl: input.thumbnailUrl,
      caption: input.caption || '',
      hashtags,
      audio: input.audio,
      duration: input.duration,
      trimStartSec: input.trimStartSec,
      trimEndSec: input.trimEndSec,
      playbackSpeed: input.playbackSpeed || 1,
      clips: input.clips || [],
      voiceoverUrl: input.voiceoverUrl,
      musicVolume: input.musicVolume,
      voiceoverVolume: input.voiceoverVolume,
      textOverlays: input.textOverlays || [],
      coverTimeSec: input.coverTimeSec,
      status,
      scheduledFor,
      collaboratorIds: [],
      collabInvites,
    });
    await reel.save();

    if (status === 'published') {
      await User.findByIdAndUpdate(creatorId, { $inc: { reelsCount: 1 } });
    }

    const creator = await User.findById(creatorId).select('username displayName avatarUrl isVerified');

    return {
      id: reel._id.toString(),
      creatorId,
      creator: {
        id: creatorId,
        username: creator?.username || '',
        displayName: creator?.displayName || '',
        avatarUrl: creator?.avatarUrl,
        isVerified: creator?.isVerified,
      },
      videoUrl: reel.videoUrl,
      thumbnailUrl: reel.thumbnailUrl,
      caption: reel.caption,
      hashtags: reel.hashtags,
      audio: reel.audio,
      duration: reel.duration,
      trimStartSec: reel.trimStartSec,
      trimEndSec: reel.trimEndSec,
      playbackSpeed: reel.playbackSpeed,
      clips: reel.clips,
      voiceoverUrl: reel.voiceoverUrl,
      musicVolume: reel.musicVolume,
      voiceoverVolume: reel.voiceoverVolume,
      textOverlays: reel.textOverlays,
      coverTimeSec: reel.coverTimeSec,
      status: reel.status,
      scheduledFor: reel.scheduledFor?.toISOString(),
      collaborators: [],
      collabInvites: collabInvites.map((c) => ({ userId: c.userId.toString(), status: c.status })),
      viewsCount: 0,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isLiked: false,
      isSaved: false,
      createdAt: reel.createdAt.toISOString(),
    };
  }

  async getReelsFeed(
    userId?: string,
    limit = 15,
    beforeCursor?: string,
    options?: { feedType?: 'for_you' | 'following'; query?: string; hashtag?: string }
  ): Promise<PaginatedResponse<ReelSummary>> {
    const query: any = {
      status: { $in: ['published', null] },
    };
    if (beforeCursor) {
      const cursorReel = await Reel.findById(beforeCursor);
      if (cursorReel) {
        query.createdAt = { $lt: cursorReel.createdAt };
      }
    }

    // Filter by Following feed if requested
    if (options?.feedType === 'following' && userId) {
      const userFollows = await Follow.find({
        followerId: userId,
        status: 'accepted',
      }).select('followingId');
      const followingCreatorIds = userFollows.map((f) => f.followingId);
      query.creatorId = { $in: followingCreatorIds };
    }

    // Filter by hashtag
    if (options?.hashtag) {
      query.hashtags = options.hashtag.toLowerCase().replace(/^#/, '');
    }

    // Search query on caption
    if (options?.query && options.query.trim()) {
      query.caption = { $regex: options.query.trim(), $options: 'i' };
    }

    const reels = await Reel.find(query)
      .populate('creatorId', 'username displayName avatarUrl isVerified')
      .populate('collaboratorIds', 'username displayName avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = reels.length > limit;
    const items = hasMore ? reels.slice(0, limit) : reels;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]._id.toString() : null;

    let likedSet = new Set<string>();
    let savedSet = new Set<string>();
    let followingSet = new Set<string>();

    if (userId) {
      const reelIds = items.map((r) => r._id);
      const userLikes = await Like.find({
        userId,
        targetType: 'reel',
        targetId: { $in: reelIds },
      });
      likedSet = new Set(userLikes.map((l) => l.targetId.toString()));

      const userSaves = await SavedItem.find({
        userId,
        itemType: 'reel',
        itemId: { $in: reelIds },
      });
      savedSet = new Set(userSaves.map((s) => s.itemId.toString()));

      const creatorIds = items.map((r) => r.creatorId);
      const userFollows = await Follow.find({
        followerId: userId,
        followingId: { $in: creatorIds },
        status: 'accepted',
      });
      followingSet = new Set(userFollows.map((f) => f.followingId.toString()));
    }

    const formatted: ReelSummary[] = items.map((r) => {
      const creator = r.creatorId as any;
      const rid = r._id.toString();
      const cid = creator ? creator._id.toString() : '';

      return {
        id: rid,
        creatorId: cid,
        creator: {
          id: cid,
          username: creator?.username || '',
          displayName: creator?.displayName || '',
          avatarUrl: creator?.avatarUrl,
          isVerified: creator?.isVerified,
        },
        videoUrl: r.videoUrl,
        thumbnailUrl: r.thumbnailUrl,
        caption: r.caption,
        hashtags: r.hashtags,
        audio: r.audio,
        duration: r.duration,
        trimStartSec: r.trimStartSec,
        trimEndSec: r.trimEndSec,
        playbackSpeed: r.playbackSpeed,
        clips: r.clips,
        voiceoverUrl: r.voiceoverUrl,
        musicVolume: r.musicVolume,
        voiceoverVolume: r.voiceoverVolume,
        textOverlays: r.textOverlays,
        coverTimeSec: r.coverTimeSec,
        status: r.status || 'published',
        collaborators: ((r.collaboratorIds || []) as any[])
          .filter((c) => c && c.username)
          .map((c) => ({
            id: c._id.toString(),
            username: c.username,
            displayName: c.displayName,
            avatarUrl: c.avatarUrl,
            isVerified: c.isVerified,
          })),
        viewsCount: r.viewsCount,
        likesCount: r.likesCount,
        commentsCount: r.commentsCount,
        sharesCount: r.sharesCount,
        isLiked: likedSet.has(rid),
        isSaved: savedSet.has(rid),
        isFollowingCreator: followingSet.has(cid),
        createdAt: r.createdAt.toISOString(),
      };
    });

    return {
      items: formatted,
      pagination: {
        page: 1,
        limit,
        total: formatted.length,
        totalPages: 1,
        hasMore,
        nextCursor,
      },
    };
  }

  async likeReel(userId: string, reelId: string): Promise<{ liked: boolean; likesCount: number }> {
    const reel = await Reel.findById(reelId);
    if (!reel) throw new Error('Reel not found');

    const existingLike = await Like.findOne({
      userId,
      targetType: 'reel',
      targetId: reelId,
    });

    if (existingLike) {
      await Like.findByIdAndDelete(existingLike._id);
      reel.likesCount = Math.max(0, reel.likesCount - 1);
      await reel.save();
      return { liked: false, likesCount: reel.likesCount };
    } else {
      const like = new Like({
        userId,
        targetType: 'reel',
        targetId: reelId,
      });
      await like.save();
      reel.likesCount += 1;
      await reel.save();
      return { liked: true, likesCount: reel.likesCount };
    }
  }

  async recordView(reelId: string): Promise<void> {
    await Reel.findByIdAndUpdate(reelId, { $inc: { viewsCount: 1 } });
  }

  async getUserReels(targetUserId: string, limit = 20): Promise<ReelSummary[]> {
    const reels = await Reel.find({
      $or: [{ creatorId: targetUserId }, { collaboratorIds: targetUserId }],
      status: { $in: ['published', null] },
    })
      .populate('creatorId', 'username displayName avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .limit(limit);

    return reels.map((r) => {
      const creator = r.creatorId as any;
      return {
        id: r._id.toString(),
        creatorId: targetUserId,
        creator: {
          id: targetUserId,
          username: creator?.username || '',
          displayName: creator?.displayName || '',
          avatarUrl: creator?.avatarUrl,
        },
        videoUrl: r.videoUrl,
        thumbnailUrl: r.thumbnailUrl,
        caption: r.caption,
        hashtags: r.hashtags,
        audio: r.audio,
        duration: r.duration,
        trimStartSec: r.trimStartSec,
        trimEndSec: r.trimEndSec,
        playbackSpeed: r.playbackSpeed,
        clips: r.clips,
        voiceoverUrl: r.voiceoverUrl,
        musicVolume: r.musicVolume,
        voiceoverVolume: r.voiceoverVolume,
        textOverlays: r.textOverlays,
        coverTimeSec: r.coverTimeSec,
        status: r.status || 'published',
        collaborators: ((r.collaboratorIds || []) as any[])
          .filter((c) => c && c.username)
          .map((c) => ({
            id: c._id.toString(),
            username: c.username,
            displayName: c.displayName,
            avatarUrl: c.avatarUrl,
            isVerified: c.isVerified,
          })),
        viewsCount: r.viewsCount,
        likesCount: r.likesCount,
        commentsCount: r.commentsCount,
        sharesCount: r.sharesCount,
        isLiked: false,
        isSaved: false,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  async getComments(reelId: string, limit = 50): Promise<any[]> {
    const comments = await ReelComment.find({ reelId })
      .populate('authorId', 'username displayName avatarUrl isVerified')
      .sort({ createdAt: 1 })
      .limit(limit);

    return comments.map((c) => {
      const author = c.authorId as any;
      return {
        id: c._id.toString(),
        reelId,
        authorId: author ? author._id.toString() : '',
        author: {
          id: author ? author._id.toString() : '',
          username: author?.username || '',
          displayName: author?.displayName || '',
          avatarUrl: author?.avatarUrl,
          isVerified: author?.isVerified,
        },
        content: c.content,
        likesCount: c.likesCount,
        createdAt: c.createdAt.toISOString(),
      };
    });
  }

  async addComment(userId: string, reelId: string, content: string): Promise<any> {
    const reel = await Reel.findById(reelId);
    if (!reel) throw new Error('Reel not found');

    const comment = new ReelComment({
      reelId,
      authorId: userId,
      content,
    });
    await comment.save();

    await Reel.findByIdAndUpdate(reelId, { $inc: { commentsCount: 1 } });
    const author = await User.findById(userId).select('username displayName avatarUrl isVerified');

    return {
      id: comment._id.toString(),
      reelId,
      authorId: userId,
      author: {
        id: userId,
        username: author?.username || '',
        displayName: author?.displayName || '',
        avatarUrl: author?.avatarUrl,
        isVerified: author?.isVerified,
      },
      content: comment.content,
      likesCount: 0,
      createdAt: comment.createdAt.toISOString(),
    };
  }

  async toggleSaveReel(userId: string, reelId: string): Promise<boolean> {
    const existing = await SavedItem.findOne({ userId, itemType: 'reel', itemId: reelId });
    if (existing) {
      await SavedItem.findByIdAndDelete(existing._id);
      return false;
    } else {
      await SavedItem.create({ userId, itemType: 'reel', itemId: reelId });
      return true;
    }
  }

  async recordShare(reelId: string): Promise<number> {
    const reel = await Reel.findByIdAndUpdate(reelId, { $inc: { sharesCount: 1 } }, { new: true });
    return reel?.sharesCount || 0;
  }

  async respondCollabInvite(
    userId: string,
    reelId: string,
    accept: boolean
  ): Promise<{ accepted: boolean }> {
    const reel = await Reel.findById(reelId);
    if (!reel) throw new Error('Reel not found');

    const invite = (reel.collabInvites || []).find((i) => i.userId.toString() === userId);
    if (!invite) throw new Error('Reel collaboration invite not found');

    invite.status = accept ? 'accepted' : 'declined';
    if (accept && !reel.collaboratorIds.some((id) => id.toString() === userId)) {
      reel.collaboratorIds.push(new mongoose.Types.ObjectId(userId));
    }
    await reel.save();
    return { accepted: accept };
  }

  async publishDueScheduledReels(now = new Date()): Promise<number> {
    const due = await Reel.find({
      status: 'scheduled',
      scheduledFor: { $lte: now },
    }).limit(50);

    for (const r of due) {
      r.status = 'published';
      r.scheduledFor = undefined;
      await r.save();
      await User.findByIdAndUpdate(r.creatorId, { $inc: { reelsCount: 1 } });
    }
    return due.length;
  }
}

export const reelService = new ReelService();

