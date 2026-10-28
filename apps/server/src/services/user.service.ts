import mongoose from 'mongoose';
import { User, IUserDocument } from '../models/User';
import { Follow } from '../models/Follow';
import { Block } from '../models/Block';
import {
  UserProfile,
  UserSummary,
  UpdateProfileInput,
  UpdatePrivacyInput,
  UpdateNotificationsInput,
} from '@infernux/shared';

export class UserService {
  async getProfile(username: string, requestingUserId?: string): Promise<UserProfile & { isFollowing?: boolean; isFollowRequested?: boolean; isBlocked?: boolean }> {
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      throw new Error('User not found');
    }

    let isFollowing = false;
    let isFollowRequested = false;
    let isBlocked = false;

    if (requestingUserId) {
      const blockerRecord = await Block.findOne({
        $or: [
          { blockerId: requestingUserId, blockedId: user._id },
          { blockerId: user._id, blockedId: requestingUserId },
        ],
      });
      if (blockerRecord) {
        isBlocked = true;
      }

      const followRecord = await Follow.findOne({
        followerId: requestingUserId,
        followingId: user._id,
      });

      if (followRecord) {
        if (followRecord.status === 'accepted') {
          isFollowing = true;
        } else if (followRecord.status === 'pending') {
          isFollowRequested = true;
        }
      }
    }

    return {
      ...user.toProfileJSON(),
      isFollowing,
      isFollowRequested,
      isBlocked,
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (input.displayName !== undefined) user.displayName = input.displayName;
    if (input.bio !== undefined) user.bio = input.bio;
    if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
    if (input.coverImageUrl !== undefined) user.coverImageUrl = input.coverImageUrl;
    if (input.phoneNumber !== undefined) user.phoneNumber = input.phoneNumber;

    await user.save();
    return user.toProfileJSON();
  }

  async updatePrivacy(userId: string, input: UpdatePrivacyInput): Promise<UserProfile> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.privacy = {
      ...user.privacy,
      ...input,
    };
    await user.save();
    return user.toProfileJSON();
  }

  async updateNotifications(userId: string, input: UpdateNotificationsInput): Promise<UserProfile> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.notifications = {
      ...user.notifications,
      ...input,
    };
    await user.save();
    return user.toProfileJSON();
  }

  async followUser(followerId: string, targetUserId: string): Promise<{ status: 'accepted' | 'pending' }> {
    if (followerId === targetUserId) {
      throw new Error('Cannot follow yourself');
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    // Check if blocked
    const isBlocked = await Block.findOne({
      $or: [
        { blockerId: followerId, blockedId: targetUserId },
        { blockerId: targetUserId, blockedId: followerId },
      ],
    });
    if (isBlocked) {
      throw new Error('Action not permitted');
    }

    const existingFollow = await Follow.findOne({
      followerId,
      followingId: targetUserId,
    });

    if (existingFollow) {
      return { status: existingFollow.status };
    }

    const initialStatus = targetUser.privacy.isPrivate ? 'pending' : 'accepted';
    const follow = new Follow({
      followerId,
      followingId: targetUserId,
      status: initialStatus,
    });
    await follow.save();

    if (initialStatus === 'accepted') {
      await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: 1 } });
      await User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } });
    }

    return { status: initialStatus };
  }

  async unfollowUser(followerId: string, targetUserId: string): Promise<void> {
    const follow = await Follow.findOneAndDelete({
      followerId,
      followingId: targetUserId,
    });

    if (follow && follow.status === 'accepted') {
      await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: -1 } });
      await User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } });
    }
  }

  async acceptFollowRequest(targetUserId: string, requesterId: string): Promise<void> {
    const follow = await Follow.findOne({
      followerId: requesterId,
      followingId: targetUserId,
      status: 'pending',
    });

    if (!follow) {
      throw new Error('Follow request not found');
    }

    follow.status = 'accepted';
    await follow.save();

    await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: 1 } });
    await User.findByIdAndUpdate(requesterId, { $inc: { followingCount: 1 } });
  }

  async rejectFollowRequest(targetUserId: string, requesterId: string): Promise<void> {
    await Follow.findOneAndDelete({
      followerId: requesterId,
      followingId: targetUserId,
      status: 'pending',
    });
  }

  async blockUser(blockerId: string, targetUserId: string): Promise<void> {
    if (blockerId === targetUserId) {
      throw new Error('Cannot block yourself');
    }

    await Block.findOneAndUpdate(
      { blockerId, blockedId: targetUserId },
      { blockerId, blockedId: targetUserId },
      { upsert: true }
    );

    // Remove any follow relationship between the two
    const f1 = await Follow.findOneAndDelete({ followerId: blockerId, followingId: targetUserId });
    if (f1 && f1.status === 'accepted') {
      await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: -1 } });
      await User.findByIdAndUpdate(blockerId, { $inc: { followingCount: -1 } });
    }

    const f2 = await Follow.findOneAndDelete({ followerId: targetUserId, followingId: blockerId });
    if (f2 && f2.status === 'accepted') {
      await User.findByIdAndUpdate(blockerId, { $inc: { followersCount: -1 } });
      await User.findByIdAndUpdate(targetUserId, { $inc: { followingCount: -1 } });
    }
  }

  async unblockUser(blockerId: string, targetUserId: string): Promise<void> {
    await Block.findOneAndDelete({ blockerId, blockedId: targetUserId });
  }

  async searchUsers(query: string, currentUserId?: string, limit = 20): Promise<UserSummary[]> {
    if (!query || query.trim().length === 0) return [];

    const regex = new RegExp(query.trim(), 'i');

    let blockedUserIds: mongoose.Types.ObjectId[] = [];
    if (currentUserId) {
      const blocks = await Block.find({
        $or: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
      });
      blockedUserIds = blocks.map((b) => (b.blockerId.toString() === currentUserId ? b.blockedId : b.blockerId));
    }

    const users = await User.find({
      _id: { $nin: blockedUserIds },
      $or: [{ username: regex }, { displayName: regex }],
    })
      .limit(limit)
      .select('_id username displayName avatarUrl isVerified isOnline lastSeen');

    return users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      isVerified: u.isVerified,
      isOnline: u.isOnline,
      lastSeen: u.lastSeen?.toISOString(),
    }));
  }
}

export const userService = new UserService();
