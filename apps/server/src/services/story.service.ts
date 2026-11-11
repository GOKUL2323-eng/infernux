import mongoose from 'mongoose';
import { Story, IStoryDocument } from '../models/Story';
import { StoryView } from '../models/StoryView';
import { StoryHighlight } from '../models/StoryHighlight';
import { Follow } from '../models/Follow';
import { User } from '../models/User';
import {
  CreateStoryInput,
  CreateStoryHighlightInput,
  InteractStoryStickerInput,
  StoryHighlightSummary,
  StoryItem,
  UserStoriesGroup,
  StoryViewRecord,
} from '@infernux/shared';

export class StoryService {
  private formatStoryItem(story: IStoryDocument | any, hasViewed: boolean, viewerId?: string): StoryItem {
    const creator = story.creatorId as any;
    const cid = creator?._id?.toString() || creator?.toString() || '';
    const isCreator = viewerId === cid;

    const formattedStickers = (story.stickers || []).map((st: any) => {
      if (st.kind === 'question_box' && !isCreator) {
        return {
          ...st,
          responses: (st.responses || []).filter((r: any) => !r.isAnonymous || r.userId === viewerId),
        };
      }
      return st;
    });

    return {
      id: story._id.toString(),
      creatorId: cid,
      creator: {
        id: cid,
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
      allowedUserIds: (story.allowedUserIds || []).map((id: any) => id.toString()),
      collaboratorIds: (story.collaboratorIds || []).map((c: any) => c?._id?.toString() || c.toString()),
      collaborators: Array.isArray(story.collaboratorIds)
        ? story.collaboratorIds
            .filter((c: any) => c && c.username)
            .map((c: any) => ({
              id: c._id.toString(),
              username: c.username,
              displayName: c.displayName,
              avatarUrl: c.avatarUrl,
              isVerified: c.isVerified,
            }))
        : undefined,
      stickers: formattedStickers,
      reactions: (story.reactions || []).map((r: any) => ({
        userId: r.userId.toString(),
        emoji: r.emoji,
        createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
      })),
      duration: story.duration,
      viewsCount: story.viewsCount,
      hasViewed,
      expiresAt: story.expiresAt.toISOString(),
      createdAt: story.createdAt.toISOString(),
    };
  }

  async createStory(creatorId: string, input: CreateStoryInput): Promise<StoryItem> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = new Story({
      creatorId,
      mediaType: input.mediaType,
      mediaUrl: input.mediaUrl,
      thumbnailUrl: input.thumbnailUrl,
      caption: input.caption,
      audience: input.audience || 'all',
      allowedUserIds: input.allowedUserIds || [],
      collaboratorIds: input.collaboratorIds || [],
      stickers: input.stickers || [],
      duration: input.duration || 5,
      expiresAt,
    });
    await story.save();
    await story.populate('creatorId', 'username displayName avatarUrl isVerified');
    await story.populate('collaboratorIds', 'username displayName avatarUrl isVerified');

    return this.formatStoryItem(story, false, creatorId);
  }

  async getStoriesFeed(userId: string): Promise<UserStoriesGroup[]> {
    const now = new Date();

    const follows = await Follow.find({
      followerId: userId,
      status: 'accepted',
    });
    const followingIds = follows.map((f) => f.followingId);
    const creatorIds = [new mongoose.Types.ObjectId(userId), ...followingIds];

    const stories = await Story.find({
      $or: [{ creatorId: { $in: creatorIds } }, { collaboratorIds: userId }],
      isExpired: false,
      expiresAt: { $gt: now },
    })
      .populate('creatorId', 'username displayName avatarUrl isVerified closeFriends')
      .populate('collaboratorIds', 'username displayName avatarUrl isVerified')
      .sort({ createdAt: 1 });

    if (stories.length === 0) return [];

    const storyIds = stories.map((s) => s._id);
    const viewedRecords = await StoryView.find({
      viewerId: userId,
      storyId: { $in: storyIds },
    });
    const viewedSet = new Set(viewedRecords.map((v) => v.storyId.toString()));

    const groupedMap = new Map<string, { user: any; stories: StoryItem[] }>();

    for (const story of stories) {
      const creator = story.creatorId as any;
      const cid = creator._id.toString();
      const isCreator = cid === userId;
      const isCollaborator = (story.collaboratorIds || []).some(
        (c: any) => (c?._id?.toString() || c.toString()) === userId
      );

      // Enforce Close Friends & Custom Audience filtering
      if (!isCreator && !isCollaborator) {
        if (story.audience === 'close_friends') {
          const cfList: string[] = (creator.closeFriends || []).map((id: any) => id.toString());
          if (!cfList.includes(userId)) continue;
        } else if (story.audience === 'custom') {
          const allowed = (story.allowedUserIds || []).map((id: any) => id.toString());
          if (!allowed.includes(userId)) continue;
        }
      }

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
      groupedMap.get(cid)!.stories.push(this.formatStoryItem(story, hasViewed, userId));
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

  // --- ADVANCED STORIES: CLOSE FRIENDS, STICKERS, REACTIONS, COLLAB, HIGHLIGHTS ---

  async getCloseFriends(userId: string) {
    const user = await User.findById(userId)
      .select('closeFriends')
      .populate('closeFriends', 'username displayName avatarUrl isVerified');
    return (user?.closeFriends || []).map((f: any) => ({
      id: f._id.toString(),
      username: f.username,
      displayName: f.displayName,
      avatarUrl: f.avatarUrl,
      isVerified: f.isVerified,
    }));
  }

  async toggleCloseFriend(userId: string, friendId: string): Promise<{ isCloseFriend: boolean }> {
    const user = await User.findById(userId).select('closeFriends');
    if (!user) throw new Error('User not found');

    const exists = user.closeFriends.some((id) => id.toString() === friendId);
    if (exists) {
      user.closeFriends = user.closeFriends.filter((id) => id.toString() !== friendId);
    } else {
      user.closeFriends.push(new mongoose.Types.ObjectId(friendId));
    }
    await user.save();
    return { isCloseFriend: !exists };
  }

  async reactToStory(storyId: string, userId: string, emoji: string): Promise<StoryItem> {
    const story = await Story.findById(storyId).populate(
      'creatorId',
      'username displayName avatarUrl isVerified'
    );
    if (!story) throw new Error('Story not found');

    story.reactions = (story.reactions || []).filter((r) => r.userId.toString() !== userId);
    story.reactions.push({
      userId: new mongoose.Types.ObjectId(userId),
      emoji,
      createdAt: new Date(),
    });
    await story.save();

    return this.formatStoryItem(story, true, userId);
  }

  async interactSticker(
    storyId: string,
    stickerId: string,
    userId: string,
    input: InteractStoryStickerInput
  ): Promise<StoryItem> {
    const story = await Story.findById(storyId).populate(
      'creatorId',
      'username displayName avatarUrl isVerified'
    );
    if (!story) throw new Error('Story not found');

    const stickers = JSON.parse(JSON.stringify(story.stickers || []));
    const sticker = stickers.find((s: any) => s.id === stickerId);
    if (!sticker) throw new Error('Sticker not found on story');

    if (sticker.kind === 'poll' && sticker.options && input.optionId) {
      for (const opt of sticker.options) {
        opt.voterIds = (opt.voterIds || []).filter((id: string) => id !== userId);
      }
      const chosen = sticker.options.find((o: any) => o.id === input.optionId);
      if (!chosen) throw new Error('Poll option not found');
      chosen.voterIds.push(userId);
    } else if (sticker.kind === 'question_box' && input.answerText) {
      const responder = input.isAnonymous
        ? null
        : await User.findById(userId).select('username');
      sticker.responses = sticker.responses || [];
      sticker.responses.push({
        id: `q_${Date.now()}`,
        userId: input.isAnonymous ? undefined : userId,
        username: input.isAnonymous ? undefined : responder?.username,
        text: input.answerText.trim(),
        isAnonymous: Boolean(input.isAnonymous),
        createdAt: new Date().toISOString(),
      });
    } else {
      throw new Error('Invalid sticker interaction');
    }

    story.stickers = stickers;
    story.markModified('stickers');
    await story.save();

    return this.formatStoryItem(story, true, userId);
  }

  async addCollaborator(storyId: string, ownerId: string, collaboratorId: string): Promise<StoryItem> {
    const story = await Story.findById(storyId).populate(
      'creatorId',
      'username displayName avatarUrl isVerified'
    );
    if (!story) throw new Error('Story not found');
    const cid = (story.creatorId as any)?._id?.toString() || story.creatorId.toString();
    if (cid !== ownerId) throw new Error('Only the story owner can invite collaborators');

    if (!story.collaboratorIds.some((id) => id.toString() === collaboratorId)) {
      story.collaboratorIds.push(new mongoose.Types.ObjectId(collaboratorId));
      await story.save();
    }
    await story.populate('collaboratorIds', 'username displayName avatarUrl isVerified');
    return this.formatStoryItem(story, true, ownerId);
  }

  async createHighlight(userId: string, input: CreateStoryHighlightInput): Promise<StoryHighlightSummary> {
    const highlight = new StoryHighlight({
      ownerId: userId,
      title: input.title,
      coverUrl: input.coverUrl,
      storyIds: input.storyIds,
    });
    await highlight.save();

    return {
      id: highlight._id.toString(),
      ownerId: userId,
      title: highlight.title,
      coverUrl: highlight.coverUrl,
      storyIds: highlight.storyIds.map((id) => id.toString()),
      createdAt: highlight.createdAt.toISOString(),
    };
  }

  async getHighlights(userId: string, viewerId?: string): Promise<StoryHighlightSummary[]> {
    const docs = await StoryHighlight.find({ ownerId: userId })
      .populate({
        path: 'storyIds',
        populate: { path: 'creatorId', select: 'username displayName avatarUrl isVerified' },
      })
      .sort({ createdAt: -1 });

    return docs.map((h) => ({
      id: h._id.toString(),
      ownerId: h.ownerId.toString(),
      title: h.title,
      coverUrl: h.coverUrl,
      storyIds: h.storyIds.map((s: any) => (s?._id ? s._id.toString() : s.toString())),
      stories: h.storyIds
        .filter((s: any) => s && s.mediaUrl)
        .map((s: any) => this.formatStoryItem(s, true, viewerId)),
      createdAt: h.createdAt.toISOString(),
    }));
  }

  async deleteHighlight(userId: string, highlightId: string): Promise<void> {
    const res = await StoryHighlight.deleteOne({ _id: highlightId, ownerId: userId });
    if (res.deletedCount === 0) throw new Error('Highlight not found');
  }
}

export const storyService = new StoryService();

