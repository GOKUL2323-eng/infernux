import mongoose from 'mongoose';
import { Story, IStoryDocument } from '../models/Story';
import { StoryView } from '../models/StoryView';
import { Follow } from '../models/Follow';
import { User } from '../models/User';
import {
  CreateStoryInput,
  StoryItem,
  UserStoriesGroup,
  StoryViewRecord,
} from '@infernux/shared';

export class StoryService {
  async createStory(creatorId: string, input: CreateStoryInput): Promise<StoryItem> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const story = new Story({
      creatorId,
      mediaType: input.mediaType,
      mediaUrl: input.mediaUrl,
      thumbnailUrl: input.thumbnailUrl,
      caption: input.caption,
      audience: input.audience || 'all',
      duration: input.duration || 5,
      expiresAt,
    });
    await story.save();

    const creator = await User.findById(creatorId).select('username displayName avatarUrl isVerified');

    return {
      id: story._id.toString(),
      creatorId,
      creator: {
        id: creatorId,
        username: creator?.username || '',
        displayName: creator?.displayName || '',
        avatarUrl: creator?.avatarUrl,
        isVerified: creator?.isVerified,
      },
      mediaType: story.mediaType,
      mediaUrl: story.mediaUrl,
      thumbnailUrl: story.thumbnailUrl,
      caption: story.caption,
      audience: story.audience,
      duration: story.duration,
      viewsCount: 0,
      hasViewed: false,
      expiresAt: story.expiresAt.toISOString(),
      createdAt: story.createdAt.toISOString(),
    };
  }

  async getStoriesFeed(userId: string): Promise<UserStoriesGroup[]> {
    const now = new Date();

    // Get following user IDs
    const follows = await Follow.find({
      followerId: userId,
      status: 'accepted',
    });
    const followingIds = follows.map((f) => f.followingId);

    // Eligible creators: self + following
    const creatorIds = [new mongoose.Types.ObjectId(userId), ...followingIds];

    const stories = await Story.find({
      creatorId: { $in: creatorIds },
      isExpired: false,
      expiresAt: { $gt: now },
    })
      .populate('creatorId', 'username displayName avatarUrl isVerified')
      .sort({ createdAt: 1 });

    if (stories.length === 0) return [];

    // Get views by this user to determine hasViewed
    const storyIds = stories.map((s) => s._id);
    const viewedRecords = await StoryView.find({
      viewerId: userId,
      storyId: { $in: storyIds },
    });
    const viewedSet = new Set(viewedRecords.map((v) => v.storyId.toString()));

    // Group stories by creator
    const groupedMap = new Map<string, { user: any; stories: StoryItem[] }>();

    for (const story of stories) {
      const creator = story.creatorId as any;
      const cid = creator._id.toString();

      if (!groupedMap.has(cid)) {
        groupedMap.set(cid, {
          user: {
            id: cid,
            username: creator.username,
            displayName: creator.displayName,
            avatarUrl: creator.avatarUrl,
            isVerified: creator.isVerified,
          },
          stories: [],
        });
      }

      const hasViewed = viewedSet.has(story._id.toString());
      groupedMap.get(cid)!.stories.push({
        id: story._id.toString(),
        creatorId: cid,
        creator: {
          id: cid,
          username: creator.username,
          displayName: creator.displayName,
          avatarUrl: creator.avatarUrl,
        },
        mediaType: story.mediaType,
        mediaUrl: story.mediaUrl,
        thumbnailUrl: story.thumbnailUrl,
        caption: story.caption,
        audience: story.audience,
        duration: story.duration,
        viewsCount: story.viewsCount,
        hasViewed,
        expiresAt: story.expiresAt.toISOString(),
        createdAt: story.createdAt.toISOString(),
      });
    }

    const result: UserStoriesGroup[] = [];

    // Always put current user's stories first if present
    if (groupedMap.has(userId)) {
      const myGroup = groupedMap.get(userId)!;
      result.push({
        user: myGroup.user,
        hasUnseenStories: false,
        stories: myGroup.stories,
        latestStoryCreatedAt: myGroup.stories[myGroup.stories.length - 1].createdAt,
      });
      groupedMap.delete(userId);
    }

    for (const group of groupedMap.values()) {
      const hasUnseen = group.stories.some((s) => !s.hasViewed);
      result.push({
        user: group.user,
        hasUnseenStories: hasUnseen,
        stories: group.stories,
        latestStoryCreatedAt: group.stories[group.stories.length - 1].createdAt,
      });
    }

    return result;
  }

  async recordStoryView(storyId: string, viewerId: string): Promise<void> {
    const story = await Story.findById(storyId);
    if (!story) throw new Error('Story not found');

    const existing = await StoryView.findOne({ storyId, viewerId });
    if (!existing) {
      await StoryView.create({ storyId, viewerId });
      await Story.findByIdAndUpdate(storyId, { $inc: { viewsCount: 1 } });
    }
  }

  async getStoryViewers(storyId: string, creatorId: string): Promise<StoryViewRecord[]> {
    const story = await Story.findById(storyId);
    if (!story) throw new Error('Story not found');
    if (story.creatorId.toString() !== creatorId) {
      throw new Error('Permission denied: Only the story creator can view the viewers list');
    }

    const views = await StoryView.find({ storyId })
      .populate('viewerId', 'username displayName avatarUrl isVerified')
      .sort({ viewedAt: -1 });

    return views.map((v) => {
      const viewer = v.viewerId as any;
      return {
        storyId,
        viewerId: viewer ? viewer._id.toString() : '',
        viewer: {
          id: viewer ? viewer._id.toString() : '',
          username: viewer?.username || '',
          displayName: viewer?.displayName || '',
          avatarUrl: viewer?.avatarUrl,
        },
        viewedAt: v.viewedAt.toISOString(),
      };
    });
  }

  async deleteStory(storyId: string, creatorId: string): Promise<void> {
    const story = await Story.findById(storyId);
    if (!story) throw new Error('Story not found');
    if (story.creatorId.toString() !== creatorId) {
      throw new Error('Permission denied: Only the creator can delete their story');
    }

    await Story.findByIdAndDelete(storyId);
    await StoryView.deleteMany({ storyId });
  }

  async cleanupExpiredStories(): Promise<number> {
    const res = await Story.updateMany(
      { expiresAt: { $lt: new Date() }, isExpired: false },
      { $set: { isExpired: true } }
    );
    return res.modifiedCount;
  }
}

export const storyService = new StoryService();
