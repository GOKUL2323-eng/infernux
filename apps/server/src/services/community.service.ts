import mongoose from 'mongoose';
import { Community, ICommunityDocument } from '../models/Community';
import { CommunityChannel, ICommunityChannelDocument } from '../models/CommunityChannel';
import { CommunityPost, ICommunityPostDocument } from '../models/CommunityPost';
import {
  AssignCommunityRoleInput,
  CommunityChannelSummary,
  CommunityPostSummary,
  CommunityRole,
  CommunitySummary,
  CreateChannelInput,
  CreateCommunityInput,
  CreateCommunityPostInput,
  SOCKET_EVENTS,
} from '@infernux/shared';
import { getIO } from '../sockets';

export class CommunityService {
  private getMemberRole(community: ICommunityDocument, userId: string): CommunityRole | undefined {
    const member = community.members.find((m) => m.userId.toString() === userId);
    return member?.role;
  }

  private async formatCommunity(
    doc: ICommunityDocument,
    viewerId?: string
  ): Promise<CommunitySummary> {
    const channelsCount = await CommunityChannel.countDocuments({ communityId: doc._id });
    const myRole = viewerId ? this.getMemberRole(doc, viewerId) : undefined;
    return {
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      category: doc.category,
      iconUrl: doc.iconUrl,
      bannerUrl: doc.bannerUrl,
      isPrivate: doc.isPrivate,
      ownerId: doc.ownerId.toString(),
      membersCount: doc.members.length,
      channelsCount,
      myRole,
      isMember: Boolean(myRole),
      createdAt: doc.createdAt.toISOString(),
    };
  }

  private formatChannel(doc: ICommunityChannelDocument): CommunityChannelSummary {
    return {
      id: doc._id.toString(),
      communityId: doc.communityId.toString(),
      name: doc.name,
      description: doc.description,
      type: doc.type,
      isAnnouncementOnly: doc.isAnnouncementOnly,
      postsCount: doc.postsCount,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  private formatPost(doc: ICommunityPostDocument): CommunityPostSummary {
    const author = doc.authorId as any;
    const authorId = author?._id?.toString() || author?.toString() || '';
    return {
      id: doc._id.toString(),
      communityId: doc.communityId.toString(),
      channelId: doc.channelId.toString(),
      authorId,
      author: {
        id: authorId,
        username: author?.username || '',
        displayName: author?.displayName || '',
        avatarUrl: author?.avatarUrl,
        isVerified: author?.isVerified,
      },
      title: doc.title,
      content: doc.content,
      attachments: doc.attachments || [],
      pinned: doc.pinned,
      parentPostId: doc.parentPostId?.toString(),
      repliesCount: doc.repliesCount,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  async createCommunity(ownerId: string, input: CreateCommunityInput): Promise<CommunitySummary> {
    const community = new Community({
      name: input.name,
      description: input.description,
      category: input.category,
      iconUrl: input.iconUrl,
      bannerUrl: input.bannerUrl,
      isPrivate: input.isPrivate,
      ownerId,
      members: [{ userId: new mongoose.Types.ObjectId(ownerId), role: 'owner', joinedAt: new Date() }],
    });
    await community.save();

    await CommunityChannel.create([
      {
        communityId: community._id,
        name: 'announcements',
        description: 'Official space updates (moderators & owner only)',
        type: 'announcement',
        isAnnouncementOnly: true,
      },
      {
        communityId: community._id,
        name: 'general',
        description: 'Open discussion & introductions',
        type: 'discussion',
        isAnnouncementOnly: false,
      },
    ]);

    return this.formatCommunity(community, ownerId);
  }

  async listCommunities(
    viewerId: string,
    opts?: { category?: string; query?: string; mineOnly?: boolean }
  ): Promise<CommunitySummary[]> {
    const filter: any = {};
    if (opts?.category) filter.category = opts.category;
    if (opts?.query) filter.name = { $regex: opts.query, $options: 'i' };
    if (opts?.mineOnly) filter['members.userId'] = viewerId;

    const docs = await Community.find(filter).sort({ createdAt: -1 }).limit(50);
    return Promise.all(docs.map((d) => this.formatCommunity(d, viewerId)));
  }

  async getCommunityDetail(
    communityId: string,
    viewerId: string
  ): Promise<{ community: CommunitySummary; channels: CommunityChannelSummary[] }> {
    const community = await Community.findById(communityId);
    if (!community) throw new Error('Community not found');
    const channels = await CommunityChannel.find({ communityId }).sort({ createdAt: 1 });
    return {
      community: await this.formatCommunity(community, viewerId),
      channels: channels.map((c) => this.formatChannel(c)),
    };
  }

  async joinCommunity(communityId: string, userId: string): Promise<CommunitySummary> {
    const community = await Community.findById(communityId);
    if (!community) throw new Error('Community not found');
    if (community.bannedUserIds.some((id) => id.toString() === userId)) {
      throw new Error('Access denied: you are banned from this community');
    }

    const exists = community.members.some((m) => m.userId.toString() === userId);
    if (!exists) {
      community.members.push({
        userId: new mongoose.Types.ObjectId(userId),
        role: 'member',
        joinedAt: new Date(),
      });
      await community.save();
    }
    return this.formatCommunity(community, userId);
  }

  async leaveCommunity(communityId: string, userId: string): Promise<{ left: boolean }> {
    const community = await Community.findById(communityId);
    if (!community) throw new Error('Community not found');
    if (community.ownerId.toString() === userId) {
      throw new Error('Owner cannot leave their own community');
    }
    community.members = community.members.filter((m) => m.userId.toString() !== userId);
    await community.save();
    return { left: true };
  }

  async assignRole(
    communityId: string,
    actorId: string,
    input: AssignCommunityRoleInput
  ): Promise<CommunitySummary> {
    const community = await Community.findById(communityId);
    if (!community) throw new Error('Community not found');
    if (community.ownerId.toString() !== actorId) {
      throw new Error('Only the owner can assign community roles');
    }
    const targetMember = community.members.find((m) => m.userId.toString() === input.userId);
    if (!targetMember) throw new Error('User is not a member of this community');
    if (targetMember.role === 'owner') throw new Error('Cannot reassign owner role');

    targetMember.role = input.role;
    await community.save();
    return this.formatCommunity(community, actorId);
  }

  async createChannel(
    communityId: string,
    actorId: string,
    input: CreateChannelInput
  ): Promise<CommunityChannelSummary> {
    const community = await Community.findById(communityId);
    if (!community) throw new Error('Community not found');
    const role = this.getMemberRole(community, actorId);
    if (role !== 'owner' && role !== 'moderator') {
      throw new Error('Permission denied: only moderators or owner can create channels');
    }

    const channel = new CommunityChannel({
      communityId,
      name: input.name,
      description: input.description,
      type: input.type,
      isAnnouncementOnly: input.type === 'announcement' ? true : input.isAnnouncementOnly,
    });
    await channel.save();
    return this.formatChannel(channel);
  }

  async createPost(
    communityId: string,
    channelId: string,
    authorId: string,
    input: CreateCommunityPostInput
  ): Promise<CommunityPostSummary> {
    const [community, channel] = await Promise.all([
      Community.findById(communityId),
      CommunityChannel.findOne({ _id: channelId, communityId }),
    ]);
    if (!community) throw new Error('Community not found');
    if (!channel) throw new Error('Channel not found');

    const role = this.getMemberRole(community, authorId);
    if (!role) throw new Error('Access denied: join the community before posting');
    if (channel.isAnnouncementOnly && role !== 'owner' && role !== 'moderator') {
      throw new Error('Permission denied: announcement channel is restricted to moderators');
    }

    const post = new CommunityPost({
      communityId,
      channelId,
      authorId,
      title: input.title,
      content: input.content,
      attachments: input.attachments || [],
      parentPostId: input.parentPostId ? new mongoose.Types.ObjectId(input.parentPostId) : undefined,
    });
    await post.save();
    await CommunityChannel.findByIdAndUpdate(channelId, { $inc: { postsCount: 1 } });
    if (input.parentPostId) {
      await CommunityPost.findByIdAndUpdate(input.parentPostId, { $inc: { repliesCount: 1 } });
    }
    await post.populate('authorId', 'username displayName avatarUrl isVerified');

    const summary = this.formatPost(post);
    const io = getIO();
    if (io) {
      io.emit(SOCKET_EVENTS.COMMUNITY_POST_NEW, summary);
    }
    return summary;
  }

  async listPosts(
    communityId: string,
    channelId: string,
    opts?: { query?: string; parentPostId?: string }
  ): Promise<CommunityPostSummary[]> {
    const filter: any = { communityId, channelId };
    if (opts?.parentPostId) {
      filter.parentPostId = opts.parentPostId;
    } else if (!opts?.query) {
      filter.parentPostId = { $exists: false };
    }
    if (opts?.query) {
      filter.$or = [
        { title: { $regex: opts.query, $options: 'i' } },
        { content: { $regex: opts.query, $options: 'i' } },
      ];
    }

    const docs = await CommunityPost.find(filter)
      .populate('authorId', 'username displayName avatarUrl isVerified')
      .sort({ pinned: -1, createdAt: -1 })
      .limit(60);

    return docs.map((d) => this.formatPost(d));
  }

  async togglePinPost(
    communityId: string,
    postId: string,
    actorId: string
  ): Promise<CommunityPostSummary> {
    const community = await Community.findById(communityId);
    if (!community) throw new Error('Community not found');
    const role = this.getMemberRole(community, actorId);
    if (role !== 'owner' && role !== 'moderator') {
      throw new Error('Permission denied: only moderators can pin posts');
    }

    const post = await CommunityPost.findOne({ _id: postId, communityId }).populate(
      'authorId',
      'username displayName avatarUrl isVerified'
    );
    if (!post) throw new Error('Community post not found');
    post.pinned = !post.pinned;
    await post.save();
    return this.formatPost(post);
  }
}

export const communityService = new CommunityService();

