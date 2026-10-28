import mongoose from 'mongoose';
import { Room, IRoomDocument } from '../models/Room';
import { RoomKey, IRoomKeyDocument } from '../models/RoomKey';
import { RoomMember } from '../models/RoomMember';
import { Conversation } from '../models/Conversation';
import { generateRoomKey, hashToken } from '../utils/crypto';
import {
  CreateRoomInput,
  RotateRoomKeyInput,
  RoomDetails,
  RoomKeyInfo,
  RoomMember as RoomMemberDTO,
  RoomRole,
} from '@infernux/shared';

export class RoomService {
  private formatKeyInfo(key: IRoomKeyDocument): RoomKeyInfo {
    return {
      keyId: key._id.toString(),
      secretKey: key.keySecret,
      inviteUrl: `https://infernux.app/join?key=${encodeURIComponent(key.keySecret)}`,
      qrPayload: `infernux://join?key=${encodeURIComponent(key.keySecret)}`,
      expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
      maxUses: key.maxUses,
      usesCount: key.usesCount,
      isActive: key.isActive,
      requiresApproval: key.requiresApproval,
      createdAt: key.createdAt.toISOString(),
    };
  }

  async createRoom(ownerId: string, input: CreateRoomInput): Promise<{ room: RoomDetails; key: RoomKeyInfo }> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const room = new Room({
        name: input.name,
        description: input.description,
        avatarUrl: input.avatarUrl,
        ownerId,
        isPrivate: input.isPrivate,
        requiresApproval: input.requiresApproval,
        memberCount: 1,
      });
      await room.save({ session });

      // Add owner as room member with 'owner' role
      const member = new RoomMember({
        roomId: room._id,
        userId: ownerId,
        role: 'owner',
      });
      await member.save({ session });

      // Generate cryptographically secure room invitation key
      const keySecret = generateRoomKey();
      const keyHash = hashToken(keySecret);
      const expiresAt = input.keyExpiresHours
        ? new Date(Date.now() + input.keyExpiresHours * 3600 * 1000)
        : null;

      const roomKey = new RoomKey({
        roomId: room._id,
        keySecret,
        keyHash,
        createdBy: ownerId,
        expiresAt,
        maxUses: input.maxUses || null,
        requiresApproval: input.requiresApproval,
      });
      await roomKey.save({ session });

      // Create linked group conversation for room messages
      const conversation = new Conversation({
        type: 'room',
        roomId: room._id,
        participants: [ownerId],
        title: room.name,
        avatarUrl: room.avatarUrl,
      });
      await conversation.save({ session });

      await session.commitTransaction();

      const keyInfo = this.formatKeyInfo(roomKey);
      return {
        room: {
          id: room._id.toString(),
          name: room.name,
          description: room.description,
          avatarUrl: room.avatarUrl,
          ownerId: ownerId,
          isPrivate: room.isPrivate,
          memberCount: 1,
          currentKey: keyInfo,
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString(),
        },
        key: keyInfo,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async joinRoomByKey(userId: string, secretKey: string): Promise<{ room: RoomDetails; conversationId: string }> {
    const keyHash = hashToken(secretKey.trim());
    const roomKey = await RoomKey.findOne({ keyHash });

    if (!roomKey) {
      throw new Error('Invalid room invitation key');
    }

    if (!roomKey.isActive) {
      throw new Error('This invitation key has been revoked or replaced');
    }

    if (roomKey.expiresAt && roomKey.expiresAt.getTime() < Date.now()) {
      throw new Error('This room invitation key has expired');
    }

    if (roomKey.maxUses !== null && roomKey.usesCount >= roomKey.maxUses) {
      throw new Error('This invitation key has reached its maximum number of uses');
    }

    const room = await Room.findById(roomKey.roomId);
    if (!room) {
      throw new Error('Room not found or no longer exists');
    }

    if (room.memberCount >= room.maxMembers) {
      throw new Error('Room capacity has been reached');
    }

    // Check if already a member
    let member = await RoomMember.findOne({ roomId: room._id, userId });
    if (!member) {
      member = new RoomMember({
        roomId: room._id,
        userId,
        role: 'member',
      });
      await member.save();

      // Increment room member count and invitation uses
      await Room.findByIdAndUpdate(room._id, { $inc: { memberCount: 1 } });
      await RoomKey.findByIdAndUpdate(roomKey._id, { $inc: { usesCount: 1 } });

      // Add to linked conversation participants
      await Conversation.findOneAndUpdate(
        { roomId: room._id },
        { $addToSet: { participants: userId } }
      );
    }

    const conversation = await Conversation.findOne({ roomId: room._id });

    return {
      room: {
        id: room._id.toString(),
        name: room.name,
        description: room.description,
        avatarUrl: room.avatarUrl,
        ownerId: room.ownerId.toString(),
        isPrivate: room.isPrivate,
        memberCount: room.memberCount,
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString(),
      },
      conversationId: conversation ? conversation._id.toString() : '',
    };
  }

  async rotateRoomKey(roomId: string, userId: string, input: RotateRoomKeyInput): Promise<RoomKeyInfo> {
    // Check authorization: caller must be owner or admin
    const member = await RoomMember.findOne({ roomId, userId });
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new Error('Only room owners or administrators can rotate invitation keys');
    }

    // Deactivate previous keys for this room
    await RoomKey.updateMany({ roomId, isActive: true }, { $set: { isActive: false } });

    // Generate new secure key
    const keySecret = generateRoomKey();
    const keyHash = hashToken(keySecret);
    const expiresAt = input.expiresHours
      ? new Date(Date.now() + input.expiresHours * 3600 * 1000)
      : null;

    const newKey = new RoomKey({
      roomId,
      keySecret,
      keyHash,
      createdBy: userId,
      expiresAt,
      maxUses: input.maxUses || null,
      requiresApproval: input.requiresApproval ?? false,
    });
    await newKey.save();

    return this.formatKeyInfo(newKey);
  }

  async getRoomDetails(roomId: string, userId: string): Promise<RoomDetails> {
    const member = await RoomMember.findOne({ roomId, userId });
    if (!member) {
      throw new Error('Access denied: You are not a member of this room');
    }

    const room = await Room.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    let currentKeyInfo: RoomKeyInfo | undefined;
    if (member.role === 'owner' || member.role === 'admin') {
      const activeKey = await RoomKey.findOne({ roomId, isActive: true });
      if (activeKey) {
        currentKeyInfo = this.formatKeyInfo(activeKey);
      }
    }

    return {
      id: room._id.toString(),
      name: room.name,
      description: room.description,
      avatarUrl: room.avatarUrl,
      ownerId: room.ownerId.toString(),
      isPrivate: room.isPrivate,
      memberCount: room.memberCount,
      currentKey: currentKeyInfo,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
    };
  }

  async getRoomMembers(roomId: string, userId: string): Promise<RoomMemberDTO[]> {
    const memberAuth = await RoomMember.findOne({ roomId, userId });
    if (!memberAuth) {
      throw new Error('Access denied: You are not a member of this room');
    }

    const members = await RoomMember.find({ roomId })
      .populate('userId', 'username displayName avatarUrl isVerified isOnline lastSeen')
      .sort({ role: 1, joinedAt: 1 });

    return members.map((m) => {
      const u = m.userId as any;
      return {
        userId: u._id.toString(),
        user: {
          id: u._id.toString(),
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          isVerified: u.isVerified,
          isOnline: u.isOnline,
          lastSeen: u.lastSeen?.toISOString(),
        },
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        isMuted: m.isMuted,
      };
    });
  }

  async updateMemberRole(roomId: string, requesterId: string, targetUserId: string, newRole: RoomRole): Promise<void> {
    const requester = await RoomMember.findOne({ roomId, userId: requesterId });
    if (!requester || requester.role !== 'owner') {
      throw new Error('Only the room owner can modify member roles');
    }

    if (requesterId === targetUserId) {
      throw new Error('Cannot change your own role directly');
    }

    await RoomMember.findOneAndUpdate(
      { roomId, userId: targetUserId },
      { $set: { role: newRole } }
    );
  }

  async removeMember(roomId: string, requesterId: string, targetUserId: string): Promise<void> {
    const requester = await RoomMember.findOne({ roomId, userId: requesterId });
    if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
      throw new Error('Permission denied: Only room owners or administrators can remove members');
    }

    const target = await RoomMember.findOne({ roomId, userId: targetUserId });
    if (!target) return;

    if (target.role === 'owner') {
      throw new Error('Cannot remove the room owner');
    }

    await RoomMember.findOneAndDelete({ roomId, userId: targetUserId });
    await Room.findByIdAndUpdate(roomId, { $inc: { memberCount: -1 } });
    await Conversation.findOneAndUpdate({ roomId }, { $pull: { participants: targetUserId } });
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const member = await RoomMember.findOne({ roomId, userId });
    if (!member) return;

    if (member.role === 'owner') {
      throw new Error('Owner cannot leave room without transferring ownership or deleting room');
    }

    await RoomMember.findOneAndDelete({ roomId, userId });
    await Room.findByIdAndUpdate(roomId, { $inc: { memberCount: -1 } });
    await Conversation.findOneAndUpdate({ roomId }, { $pull: { participants: userId } });
  }

  async deleteRoom(roomId: string, userId: string): Promise<void> {
    const room = await Room.findById(roomId);
    if (!room) throw new Error('Room not found');
    if (room.ownerId.toString() !== userId) {
      throw new Error('Only the room owner can delete the room');
    }

    await RoomMember.deleteMany({ roomId });
    await RoomKey.deleteMany({ roomId });
    await Conversation.findOneAndDelete({ roomId });
    await Room.findByIdAndDelete(roomId);
  }
}

export const roomService = new RoomService();
