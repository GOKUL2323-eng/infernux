import mongoose from 'mongoose';
import { Conversation, IConversationDocument } from '../models/Conversation';
import { Message, IMessageDocument } from '../models/Message';
import { User } from '../models/User';
import { Room } from '../models/Room';
import { deleteMediaAttachments } from '../utils/fileDeletion';
import { getIO } from '../sockets';
import { logger } from '../utils/logger';
import {
  SendMessageInput,
  EditMessageInput,
  AddReactionInput,
  CreateConversationInput,
  ConversationSummary,
  MessageSummary,
  PaginatedResponse,
  SOCKET_EVENTS,
  DisappearingMode,
  MediaSavePolicy,
} from '@infernux/shared';

export class ChatService {
  async getConversations(userId: string): Promise<ConversationSummary[]> {
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'username displayName avatarUrl isVerified isOnline lastSeen')
      .populate('lastMessage.senderId', 'username displayName avatarUrl')
      .sort({ updatedAt: -1 });

    const summaries: ConversationSummary[] = [];

    for (const conv of conversations) {
      const participants = (conv.participants as any[]).map((p) => ({
        id: p._id.toString(),
        username: p.username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        isVerified: p.isVerified,
        isOnline: p.isOnline,
        lastSeen: p.lastSeen?.toISOString(),
      }));

      // Calculate unread count (messages sent after last read receipt)
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        senderId: { $ne: userId },
        'receipts.userId': { $ne: userId },
      });

      let title = conv.title || '';
      let avatarUrl = conv.avatarUrl;

      // In direct 1:1 chats, display the other person's name and avatar
      if (conv.type === 'direct') {
        const other = participants.find((p) => p.id !== userId);
        if (other) {
          title = other.displayName;
          avatarUrl = other.avatarUrl;
        }
      }

      summaries.push({
        id: conv._id.toString(),
        type: conv.type,
        title,
        avatarUrl,
        participants,
        lastMessage: conv.lastMessage
          ? {
              id: conv.lastMessage.id?.toString() || '',
              conversationId: conv._id.toString(),
              senderId: conv.lastMessage.senderId ? (conv.lastMessage.senderId as any)._id?.toString() : '',
              sender: {
                id: conv.lastMessage.senderId ? (conv.lastMessage.senderId as any)._id?.toString() : '',
                username: (conv.lastMessage.senderId as any)?.username || '',
                displayName: (conv.lastMessage.senderId as any)?.displayName || '',
                avatarUrl: (conv.lastMessage.senderId as any)?.avatarUrl,
              },
              contentType: conv.lastMessage.contentType as any,
              content: conv.lastMessage.content,
              reactions: [],
              receipts: [],
              isEdited: false,
              isDeleted: false,
              isPinned: false,
              createdAt: conv.lastMessage.createdAt?.toISOString() || conv.updatedAt.toISOString(),
              updatedAt: conv.lastMessage.createdAt?.toISOString() || conv.updatedAt.toISOString(),
            }
          : undefined,
        unreadCount,
        isMuted: conv.mutedBy.some((id) => id.toString() === userId),
        isPinned: conv.pinnedBy.some((id) => id.toString() === userId),
        updatedAt: conv.updatedAt.toISOString(),
        roomId: conv.roomId?.toString(),
      });
    }

    return summaries;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    limit = 30,
    beforeCursor?: string
  ): Promise<PaginatedResponse<MessageSummary>> {
    const conv = await Conversation.findOne({ _id: conversationId, participants: userId });
    if (!conv) {
      throw new Error('Access denied: You are not a participant in this conversation');
    }

    const query: any = {
      conversationId,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
        { viewOnce: true },
      ],
    };
    if (beforeCursor) {
      const cursorMessage = await Message.findById(beforeCursor);
      if (cursorMessage) {
        query.createdAt = { $lt: cursorMessage.createdAt };
      }
    }

    const messages = await Message.find(query)
      .populate('senderId', 'username displayName avatarUrl isVerified')
      .populate('reactions.userId', 'username displayName avatarUrl')
      .populate('savedBy.userId', 'username displayName')
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]._id.toString() : null;

    const formattedItems: MessageSummary[] = items.map((m) => {
      const sender = m.senderId as any;
      const isViewerRecipient = sender?._id?.toString() !== userId;
      const hasViewed = m.viewedBy && m.viewedBy.some((v: any) => v.userId?.toString() === userId);
      const isViewOnceExpiredForUser = m.viewOnce && (m.isExpired || (isViewerRecipient && hasViewed));

      return {
        id: m._id.toString(),
        conversationId: m.conversationId.toString(),
        senderId: sender ? sender._id.toString() : '',
        sender: {
          id: sender ? sender._id.toString() : '',
          username: sender?.username || 'Unknown',
          displayName: sender?.displayName || 'Unknown',
          avatarUrl: sender?.avatarUrl,
          isVerified: sender?.isVerified,
        },
        contentType: m.contentType,
        content: m.isDeleted
          ? 'This message was deleted'
          : isViewOnceExpiredForUser
          ? 'Opened'
          : m.content,
        attachments: m.isDeleted || isViewOnceExpiredForUser ? [] : m.attachments,
        replyTo:
          m.replyTo && m.replyTo.id
            ? {
                id: m.replyTo.id.toString(),
                senderDisplayName: m.replyTo.senderDisplayName,
                content: m.replyTo.content,
                contentType: m.replyTo.contentType,
              }
            : undefined,
        reactions: m.reactions.map((r: any) => ({
          userId: r.userId?._id?.toString() || r.userId?.toString(),
          emoji: r.emoji,
          createdAt: r.createdAt.toISOString(),
        })),
        receipts: m.receipts.map((rc: any) => ({
          userId: rc.userId.toString(),
          status: rc.status,
          updatedAt: rc.updatedAt.toISOString(),
        })),
        isEdited: m.isEdited,
        isDeleted: m.isDeleted,
        isPinned: m.isPinned,
        expiresAt: m.expiresAt?.toISOString(),
        disappearingMode: m.disappearingMode,
        viewOnce: m.viewOnce,
        viewedAt: m.viewedAt?.toISOString(),
        isExpired: m.isExpired,
        mediaSavePolicy: m.mediaSavePolicy,
        savedBy: (m.savedBy || []).map((s: any) => ({
          userId: s.userId?._id?.toString() || s.userId?.toString(),
          username: s.userId?.username,
          savedAt: s.savedAt?.toISOString() || new Date().toISOString(),
        })),
        metadata: m.metadata,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      };
    });

    return {
      items: formattedItems.reverse(), // Client expects chronological top-to-bottom
      pagination: {
        page: 1,
        limit,
        total: formattedItems.length,
        totalPages: 1,
        hasMore,
        nextCursor,
      },
    };
  }

  async sendMessage(senderId: string, input: SendMessageInput): Promise<MessageSummary> {
    const conv = await Conversation.findOne({
      _id: input.conversationId,
      participants: senderId,
    });
    if (!conv) {
      throw new Error('Access denied: You are not a member of this conversation');
    }

    let disappearingMode: DisappearingMode | undefined;
    let mediaSavePolicy: MediaSavePolicy | undefined;
    const isViewOnce = Boolean(input.viewOnce);
    let expiresAt: Date | undefined;

    // Check if this conversation is linked to a private room
    if (conv.type === 'room' && conv.roomId) {
      const room = await Room.findById(conv.roomId);
      if (!room) {
        throw new Error('Associated room not found or deleted');
      }
      if (room.isDeleting) {
        throw new Error('Cannot send messages: This private room is being permanently deleted');
      }

      mediaSavePolicy = room.mediaSavePolicy;
      disappearingMode = (input.disappearingMode || room.disappearingMode || '24h') as DisappearingMode;

      if (isViewOnce) {
        disappearingMode = 'after_view';
      } else if (disappearingMode === '24h') {
        expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
      } else if (disappearingMode === '7d') {
        expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
      }
    }

    let replyToObj;
    if (input.replyToId) {
      const parentMsg = await Message.findById(input.replyToId).populate('senderId', 'displayName');
      if (parentMsg) {
        replyToObj = {
          id: parentMsg._id,
          senderDisplayName: (parentMsg.senderId as any)?.displayName || 'User',
          content: parentMsg.isDeleted ? 'Deleted message' : parentMsg.content.slice(0, 100),
          contentType: parentMsg.contentType,
        };
      }
    }

    const message = new Message({
      conversationId: conv._id,
      senderId,
      contentType: input.contentType,
      content: input.content,
      attachments: input.attachments || [],
      replyTo: replyToObj,
      clientTempId: input.clientTempId,
      metadata: input.metadata,
      receipts: [{ userId: senderId, status: 'sent', updatedAt: new Date() }],
      viewOnce: isViewOnce,
      disappearingMode,
      mediaSavePolicy,
      expiresAt,
      isExpired: false,
    });
    await message.save();

    // Update conversation's last message
    conv.lastMessage = {
      id: message._id,
      senderId: new mongoose.Types.ObjectId(senderId),
      content: isViewOnce
        ? '[View Once Media]'
        : input.contentType === 'text'
        ? input.content
        : `[${input.contentType}]`,
      contentType: input.contentType,
      createdAt: message.createdAt,
    };
    await conv.save();

    const sender = await User.findById(senderId).select('username displayName avatarUrl isVerified');

    return {
      id: message._id.toString(),
      conversationId: conv._id.toString(),
      senderId,
      sender: {
        id: senderId,
        username: sender?.username || '',
        displayName: sender?.displayName || '',
        avatarUrl: sender?.avatarUrl,
        isVerified: sender?.isVerified,
      },
      contentType: message.contentType,
      content: message.content,
      attachments: message.attachments,
      replyTo:
        message.replyTo && message.replyTo.id
          ? {
              id: message.replyTo.id.toString(),
              senderDisplayName: message.replyTo.senderDisplayName,
              content: message.replyTo.content,
              contentType: message.replyTo.contentType,
            }
          : undefined,
      reactions: [],
      receipts: [{ userId: senderId, status: 'sent', updatedAt: message.createdAt.toISOString() }],
      isEdited: false,
      isDeleted: false,
      isPinned: false,
      expiresAt: message.expiresAt?.toISOString(),
      disappearingMode: message.disappearingMode,
      viewOnce: message.viewOnce,
      isExpired: message.isExpired,
      mediaSavePolicy: message.mediaSavePolicy,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      metadata: message.metadata,
    };
  }

  async editMessage(messageId: string, userId: string, input: EditMessageInput): Promise<MessageSummary> {
    const msg = await Message.findById(messageId);
    if (!msg) throw new Error('Message not found');
    if (msg.senderId.toString() !== userId) throw new Error('Permission denied: You can only edit your own messages');
    if (msg.isDeleted) throw new Error('Cannot edit a deleted message');

    msg.content = input.content;
    msg.isEdited = true;
    await msg.save();

    const sender = await User.findById(userId).select('username displayName avatarUrl isVerified');
    return {
      id: msg._id.toString(),
      conversationId: msg.conversationId.toString(),
      senderId: userId,
      sender: {
        id: userId,
        username: sender?.username || '',
        displayName: sender?.displayName || '',
        avatarUrl: sender?.avatarUrl,
        isVerified: sender?.isVerified,
      },
      contentType: msg.contentType,
      content: msg.content,
      attachments: msg.attachments,
      reactions: (msg.reactions || []).map((r: any) => ({
        userId: r.userId.toString(),
        emoji: r.emoji,
        createdAt: r.createdAt.toISOString(),
      })),
      receipts: (msg.receipts || []).map((rc: any) => ({
        userId: rc.userId.toString(),
        status: rc.status,
        updatedAt: rc.updatedAt.toISOString(),
      })),
      isEdited: true,
      isDeleted: false,
      isPinned: msg.isPinned,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString(),
    };
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const msg = await Message.findById(messageId);
    if (!msg) throw new Error('Message not found');
    if (msg.senderId.toString() !== userId) {
      throw new Error('Permission denied: You can only delete your own messages');
    }

    msg.isDeleted = true;
    msg.content = '';
    msg.attachments = [];
    await msg.save();
  }

  async addReaction(messageId: string, userId: string, input: AddReactionInput): Promise<void> {
    const msg = await Message.findById(messageId);
    if (!msg) throw new Error('Message not found');

    // Remove any existing reaction by this user first
    msg.reactions = msg.reactions.filter((r) => r.userId.toString() !== userId);
    msg.reactions.push({
      userId: new mongoose.Types.ObjectId(userId),
      emoji: input.emoji,
      createdAt: new Date(),
    });
    await msg.save();
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: userId },
        'receipts.userId': { $ne: userId },
      },
      {
        $push: {
          receipts: {
            userId: new mongoose.Types.ObjectId(userId),
            status: 'read',
            updatedAt: new Date(),
          },
        },
      }
    );
  }

  async createConversation(creatorId: string, input: CreateConversationInput): Promise<string> {
    if (input.type === 'direct') {
      if (!input.recipientId) throw new Error('Recipient ID is required for direct conversations');

      // Check for existing 1:1 conversation between these two
      const existing = await Conversation.findOne({
        type: 'direct',
        participants: { $all: [creatorId, input.recipientId], $size: 2 },
      });
      if (existing) return existing._id.toString();

      const conv = new Conversation({
        type: 'direct',
        participants: [creatorId, input.recipientId],
      });
      await conv.save();
      return conv._id.toString();
    } else {
      const participants = Array.from(new Set([creatorId, ...(input.participantIds || [])]));
      const conv = new Conversation({
        type: input.type,
        title: input.title,
        participants,
        roomId: input.roomId,
      });
      await conv.save();
      return conv._id.toString();
    }
  }

  /**
   * Consumes a Snapchat-style view-once media message:
   * Immediately deletes the media attachments from server disk & Cloudinary,
   * updates the message status to opened/expired, and notifies all participants.
   */
  async consumeViewOnce(messageId: string, userId: string): Promise<void> {
    const msg = await Message.findById(messageId);
    if (!msg) throw new Error('Message not found');

    const conv = await Conversation.findOne({ _id: msg.conversationId, participants: userId });
    if (!conv) {
      throw new Error('Access denied: You are not a member of this conversation');
    }

    if (!msg.viewOnce) {
      throw new Error('This message is not configured as view-once');
    }

    if (msg.isExpired) {
      return; // Already consumed
    }

    // 1. Immediately delete media attachments from server disk and Cloudinary
    if (msg.attachments && msg.attachments.length > 0) {
      try {
        await deleteMediaAttachments(msg.attachments);
      } catch (err) {
        logger.error('Error deleting view-once media attachments', 'ChatService', err);
      }
    }

    // 2. Mark consumed and wipe media URLs so they cannot be retrieved again
    msg.isExpired = true;
    msg.viewedAt = new Date();
    msg.attachments = [];
    msg.content = 'Opened';
    if (!msg.viewedBy) msg.viewedBy = [];
    msg.viewedBy.push({ userId: new mongoose.Types.ObjectId(userId), viewedAt: new Date() });
    await msg.save();

    // 3. Notify all conversation participants via Socket.IO
    const io = getIO();
    if (io) {
      io.to(`conversation:${msg.conversationId}`).emit(SOCKET_EVENTS.MESSAGE_CONSUMED, {
        messageId: msg._id.toString(),
        conversationId: msg.conversationId.toString(),
        viewedByUserId: userId,
        viewedAt: msg.viewedAt.toISOString(),
      });
    }

    logger.info(`View-once message ${messageId} consumed and media purged by user ${userId}`, 'ChatService');
  }

  /**
   * Records that a user explicitly saved a media attachment (when room policy allows it).
   * Notifies all room participants with real-time alert and system message.
   */
  async recordMediaSaved(messageId: string, userId: string, mediaUrl: string): Promise<void> {
    const msg = await Message.findById(messageId);
    if (!msg) throw new Error('Message not found');

    const conv = await Conversation.findOne({ _id: msg.conversationId, participants: userId });
    if (!conv) {
      throw new Error('Access denied: You are not a member of this conversation');
    }

    // Verify room policy
    if (conv.roomId) {
      const room = await Room.findById(conv.roomId);
      if (room && (room.mediaSavePolicy === 'view_only' || room.mediaSavePolicy === 'view_once')) {
        throw new Error('Media saving is disabled by the private room policy');
      }
    }

    if (msg.viewOnce) {
      throw new Error('View-once media cannot be saved to device');
    }

    // Record save entry if not already saved by this user
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const alreadySaved = msg.savedBy && msg.savedBy.some((s) => s.userId.toString() === userId);
    if (!alreadySaved) {
      if (!msg.savedBy) msg.savedBy = [];
      msg.savedBy.push({ userId: userObjectId, savedAt: new Date() });
      await msg.save();
    }

    const saver = await User.findById(userId).select('username displayName');
    const saverName = saver?.displayName || saver?.username || 'User';

    // Broadcast real-time notification to all participants
    const io = getIO();
    if (io) {
      io.to(`conversation:${msg.conversationId}`).emit(SOCKET_EVENTS.MEDIA_SAVED, {
        messageId: msg._id.toString(),
        conversationId: msg.conversationId.toString(),
        userId,
        username: saver?.username,
        displayName: saverName,
        savedAt: new Date().toISOString(),
        message: `${saverName} saved a photo to camera roll`,
      });
    }

    logger.info(`User ${userId} saved media in message ${messageId}`, 'ChatService');
  }

  /**
   * Background cleanup routine for expired private room messages:
   * Finds all messages with expiresAt in the past, securely unlinks storage files,
   * marks them as expired/cleared, and emits real-time events.
   */
  async cleanupExpiredPrivateMessages(): Promise<number> {
    const now = new Date();
    const expiredMessages = await Message.find({
      isExpired: { $ne: true },
      isDeleted: false,
      expiresAt: { $exists: true, $ne: null, $lte: now },
    }).limit(100);

    if (expiredMessages.length === 0) return 0;

    let count = 0;
    const io = getIO();

    for (const msg of expiredMessages) {
      try {
        if (msg.attachments && msg.attachments.length > 0) {
          await deleteMediaAttachments(msg.attachments);
        }

        msg.isExpired = true;
        msg.attachments = [];
        msg.content = 'This message has expired';
        await msg.save();
        count++;

        if (io) {
          io.to(`conversation:${msg.conversationId}`).emit(SOCKET_EVENTS.MESSAGE_EXPIRED, {
            messageId: msg._id.toString(),
            conversationId: msg.conversationId.toString(),
            expiredAt: now.toISOString(),
          });
        }
      } catch (err) {
        logger.error(`Error cleaning up expired message ${msg._id}`, 'ChatService', err);
      }
    }

    if (count > 0) {
      logger.info(`Cleaned up and purged ${count} expired private messages`, 'ChatService');
    }
    return count;
  }
}

export const chatService = new ChatService();

