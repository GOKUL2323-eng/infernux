import { Reel } from '../models/Reel';
import { Post } from '../models/Post';
import { SavedItem } from '../models/SavedItem';
import { User } from '../models/User';
import { CreatorAnalyticsSummary, ReelSummary } from '@infernux/shared';

export class CreatorService {
  async getAnalytics(userId: string): Promise<CreatorAnalyticsSummary> {
    const [user, reels, posts] = await Promise.all([
      User.findById(userId).select('username displayName avatarUrl isVerified followersCount'),
      Reel.find({ creatorId: userId })
        .populate('creatorId', 'username displayName avatarUrl isVerified')
        .sort({ viewsCount: -1, createdAt: -1 }),
      Post.find({ authorId: userId }).select('likesCount commentsCount sharesCount'),
    ]);

    const publishedReels = reels.filter((r) => !r.status || r.status === 'published');
    const draftsCount = reels.filter((r) => r.status === 'draft').length;
    const scheduledCount = reels.filter((r) => r.status === 'scheduled').length;

    const totalViews = publishedReels.reduce((acc, r) => acc + (r.viewsCount || 0), 0);
    const totalLikes =
      publishedReels.reduce((acc, r) => acc + (r.likesCount || 0), 0) +
      posts.reduce((acc, p) => acc + (p.likesCount || 0), 0);
    const totalComments =
      publishedReels.reduce((acc, r) => acc + (r.commentsCount || 0), 0) +
      posts.reduce((acc, p) => acc + (p.commentsCount || 0), 0);
    const totalShares =
      publishedReels.reduce((acc, r) => acc + (r.sharesCount || 0), 0) +
      posts.reduce((acc, p) => acc + (p.sharesCount || 0), 0);

    const reelIds = reels.map((r) => r._id);
    const postIds = posts.map((p) => p._id);
    const totalSaves = await SavedItem.countDocuments({
      itemId: { $in: [...reelIds, ...postIds] },
    });

    const engagementTotal = totalLikes + totalComments + totalShares + totalSaves;
    const denominator = Math.max(totalViews, posts.length * 10, 1);
    const engagementRate = Number(((engagementTotal / denominator) * 100).toFixed(2));

    const topReels: ReelSummary[] = publishedReels.slice(0, 5).map((r) => {
      const creator = r.creatorId as any;
      return {
        id: r._id.toString(),
        creatorId: userId,
        creator: {
          id: userId,
          username: creator?.username || user?.username || '',
          displayName: creator?.displayName || user?.displayName || '',
          avatarUrl: creator?.avatarUrl || user?.avatarUrl,
          isVerified: creator?.isVerified ?? user?.isVerified,
        },
        videoUrl: r.videoUrl,
        thumbnailUrl: r.thumbnailUrl,
        caption: r.caption,
        hashtags: r.hashtags,
        audio: r.audio,
        duration: r.duration,
        status: r.status,
        viewsCount: r.viewsCount,
        likesCount: r.likesCount,
        commentsCount: r.commentsCount,
        sharesCount: r.sharesCount,
        isLiked: false,
        isSaved: false,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return {
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      totalSaves,
      followersCount: user?.followersCount || 0,
      engagementRate,
      reelsCount: publishedReels.length,
      postsCount: posts.length,
      draftsCount,
      scheduledCount,
      topReels,
    };
  }

  async getStudioQueue(userId: string): Promise<ReelSummary[]> {
    const reels = await Reel.find({
      creatorId: userId,
      status: { $in: ['draft', 'scheduled'] },
    })
      .populate('creatorId', 'username displayName avatarUrl isVerified')
      .sort({ updatedAt: -1 });

    return reels.map((r) => {
      const creator = r.creatorId as any;
      return {
        id: r._id.toString(),
        creatorId: userId,
        creator: {
          id: userId,
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
        status: r.status,
        scheduledFor: r.scheduledFor?.toISOString(),
        playbackSpeed: r.playbackSpeed,
        trimStartSec: r.trimStartSec,
        trimEndSec: r.trimEndSec,
        clips: r.clips,
        textOverlays: r.textOverlays,
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

  async publishDraftReel(userId: string, reelId: string): Promise<ReelSummary> {
    const reel = await Reel.findOne({ _id: reelId, creatorId: userId });
    if (!reel) throw new Error('Draft reel not found');
    reel.status = 'published';
    reel.scheduledFor = undefined;
    await reel.save();
    await User.findByIdAndUpdate(userId, { $inc: { reelsCount: 1 } });

    const creator = await User.findById(userId).select('username displayName avatarUrl isVerified');
    return {
      id: reel._id.toString(),
      creatorId: userId,
      creator: {
        id: userId,
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
      status: reel.status,
      viewsCount: reel.viewsCount,
      likesCount: reel.likesCount,
      commentsCount: reel.commentsCount,
      sharesCount: reel.sharesCount,
      isLiked: false,
      isSaved: false,
      createdAt: reel.createdAt.toISOString(),
    };
  }
}

export const creatorService = new CreatorService();

