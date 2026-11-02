import mongoose from 'mongoose';
import { Room, IRoomDocument } from '../models/Room';
import { RoomKey, IRoomKeyDocument } from '../models/RoomKey';
import { RoomMember } from '../models/RoomMember';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { generateRoomKey, hashToken } from '../utils/crypto';
import { deleteMediaAttachments } from '../utils/fileDeletion';
import { getIO } from '../sockets';
import { logger } from '../utils/logger';
import {
  CreateRoomInput,
  RotateRoomKeyInput,
  UpdateRoomPrivacySettingsInput,
  RoomDetails,
  RoomKeyInfo,
  RoomMember as RoomMemberDTO,
  RoomRole,
  SOCKET_EVENTS,
  MediaAttachment,
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
        isPrivate: input.isPrivate ?? true,
        requiresApproval: input.requiresApproval,
        disappearingMode: input.disappearingMode || '24h',
        mediaSavePolicy: input.mediaSavePolicy || 'allow_save',
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
          disappearingMode: room.disappearingMode,
          mediaSavePolicy: room.mediaSavePolicy,
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
      disappearingMode: room.disappearingMode,
      mediaSavePolicy: room.mediaSavePolicy,
      isDeleting: room.isDeleting,
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

  async updateRoomPrivacySettings(
    roomId: string,
    userId: string,
    input: UpdateRoomPrivacySettingsInput
  ): Promise<RoomDetails> {
    const member = await RoomMember.findOne({ roomId, userId });
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new Error('Permission denied: Only room owners or administrators can modify privacy settings');
    }

    const updateFields: any = {};
    if (input.disappearingMode !== undefined) updateFields.disappearingMode = input.disappearingMode;
    if (input.mediaSavePolicy !== undefined) updateFields.mediaSavePolicy = input.mediaSavePolicy;

    const room = await Room.findByIdAndUpdate(roomId, { $set: updateFields }, { new: true });
    if (!room) throw new Error('Room not found');

    const details = await this.getRoomDetails(roomId, userId);

    // Notify room participants in real-time
    const io = getIO();
    if (io) {
      io.to(`room:${roomId}`).emit(SOCKET_EVENTS.ROOM_SETTINGS_UPDATED, {
        roomId,
        disappearingMode: room.disappearingMode,
        mediaSavePolicy: room.mediaSavePolicy,
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
      });

      const conv = await Conversation.findOne({ roomId });
      if (conv) {
        io.to(`conversation:${conv._id}`).emit(SOCKET_EVENTS.ROOM_SETTINGS_UPDATED, {
          roomId,
          conversationId: conv._id.toString(),
          disappearingMode: room.disappearingMode,
          mediaSavePolicy: room.mediaSavePolicy,
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return details;
  }

  /**
   * Atomic destruction of an entire private room and its conversation, messages, and attachments.
   * Safe for simultaneous leave requests: only the first caller claims the deletion lock.
   */
  async destroyPrivateRoom(roomId: string, leaverId: string, reason = 'participant_left'): Promise<boolean> {
    // 1. Atomically claim deletion lock to prevent race conditions from simultaneous leaves
    const room = await Room.findOneAndUpdate(
      { _id: roomId, isDeleting: { $ne: true } },
      { $set: { isDeleting: true, deletedBy: new mongoose.Types.ObjectId(leaverId), deletedAt: new Date() } },
      { new: true }
    );

    if (!room) {
      logger.info(`Private room ${roomId} is already being deleted or does not exist. Skipping duplicate destruction.`, 'RoomService');
      return false;
    }

    // 2. Fetch leaver details for participant notifications
    const leaver = await User.findById(leaverId).select('displayName username');
    const leaverName = leaver?.displayName || leaver?.username || 'A participant';

    // 3. Locate linked conversation
    const conv = await Conversation.findOne({ roomId });
    let conversationIdStr = '';

    if (conv) {
      conversationIdStr = conv._id.toString();

      // 4. Find all messages belonging to this room conversation
      const messages = await Message.find({ conversationId: conv._id });

      // 5. Collect all media attachments (photos, videos, audio recordings, documents, PDFs)
      const allAttachments: MediaAttachment[] = [];
      for (const msg of messages) {
        if (msg.attachments && msg.attachments.length > 0) {
          allAttachments.push(...msg.attachments);
        }
      }

      // 6. Permanently delete all media files from local storage & Cloudinary
      if (allAttachments.length > 0) {
        try {
          await deleteMediaAttachments(allAttachments);
          logger.info(`Permanently deleted ${allAttachments.length} attachments for private room ${roomId}`, 'RoomService');
        } catch (cleanupErr) {
          logger.error(`Error deleting storage attachments during room destruction`, 'RoomService', cleanupErr);
        }
      }

      // 7. Delete all messages, reactions, receipts, and related metadata from DB
      await Message.deleteMany({ conversationId: conv._id });

      // 8. Delete the conversation
      await Conversation.findByIdAndDelete(conv._id);
    }

    // 9. Remove all room memberships and invitation keys
    await RoomMember.deleteMany({ roomId });
    await RoomKey.deleteMany({ roomId });

    // 10. Permanently remove the room record
    await Room.findByIdAndDelete(roomId);

    // 11. Broadcast real-time destruction event to all connected devices
    const io = getIO();
    if (io) {
      const destructionPayload = {
        roomId,
        conversationId: conversationIdStr,
        reason,
        leaverId,
        leaverName,
        timestamp: new Date().toISOString(),
        message: `${leaverName} left the private room. The entire chat and all shared content have been permanently deleted for everyone.`,
      };

      if (conversationIdStr) {
        io.to(`conversation:${conversationIdStr}`).emit(SOCKET_EVENTS.ROOM_DESTROYED, destructionPayload);
      }
      io.to(`room:${roomId}`).emit(SOCKET_EVENTS.ROOM_DESTROYED, destructionPayload);
    }

    logger.info(`Private room ${roomId} permanently destroyed for all participants by user ${leaverId} (${leaverName})`, 'RoomService');
    return true;
  }

  async leaveRoom(roomId: string, userId: string): Promise<{ wasDestroyed: boolean }> {
    const member = await RoomMember.findOne({ roomId, userId });
    if (!member) {
      return { wasDestroyed: false };
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return { wasDestroyed: false };
    }

    // SNAPCHAT-STYLE CRITICAL RULE:
    // If the room is a Private Room, leaving permanently deletes the entire room & chat for everyone!
    if (room.isPrivate) {
      const wasDestroyed = await this.destroyPrivateRoom(roomId, userId, 'participant_left');
      return { wasDestroyed };
    }

    // Standard non-private community room leave logic
    if (member.role === 'owner') {
      throw new Error('Owner cannot leave room without transferring ownership or deleting room');
    }

    await RoomMember.findOneAndDelete({ roomId, userId });
    await Room.findByIdAndUpdate(roomId, { $inc: { memberCount: -1 } });
    await Conversation.findOneAndUpdate({ roomId }, { $pull: { participants: userId } });

    const io = getIO();
    if (io) {
      io.to(`room:${roomId}`).emit(SOCKET_EVENTS.ROOM_LEFT, { roomId, userId });
    }

    return { wasDestroyed: false };
  }

  async deleteRoom(roomId: string, userId: string): Promise<void> {
    const room = await Room.findById(roomId);
    if (!room) throw new Error('Room not found');
    if (room.ownerId.toString() !== userId) {
      throw new Error('Only the room owner can delete the room');
    }

    await this.destroyPrivateRoom(roomId, userId, 'owner_deleted');
  }
}

export const roomService = new RoomService();

