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

    const reel = new Reel({
      creatorId,
      videoUrl: input.videoUrl,
      thumbnailUrl: input.thumbnailUrl,
      caption: input.caption || '',
      hashtags,
      audio: input.audio,
      duration: input.duration,
    });
    await reel.save();

    await User.findByIdAndUpdate(creatorId, { $inc: { reelsCount: 1 } });

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
    beforeCursor?: string
  ): Promise<PaginatedResponse<ReelSummary>> {
    const query: any = {};
    if (beforeCursor) {
      const cursorReel = await Reel.findById(beforeCursor);
      if (cursorReel) {
        query.createdAt = { $lt: cursorReel.createdAt };
      }
    }

    const reels = await Reel.find(query)
      .populate('creatorId', 'username displayName avatarUrl isVerified')
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
    const reels = await Reel.find({ creatorId: targetUserId })
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
}

export const reelService = new ReelService();

