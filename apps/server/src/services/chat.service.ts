import mongoose from 'mongoose';
import { Conversation, IConversationDocument } from '../models/Conversation';
import { Message, IMessageDocument } from '../models/Message';
import { User } from '../models/User';
import { Room } from '../models/Room';
import { ChatFolder } from '../models/ChatFolder';
import { ConversationDraft } from '../models/ConversationDraft';
import { SavedMessage } from '../models/SavedMessage';
import { MessageReminder } from '../models/MessageReminder';
import { Notification } from '../models/Notification';
import { deleteMediaAttachments } from '../utils/fileDeletion';
import { getIO } from '../sockets';
import { logger } from '../utils/logger';
import { streakService } from './streak.service';
import { translationService } from './translation.service';
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
  InteractMessageInput,
  InteractiveMessageData,
} from '@infernux/shared';

export class ChatService {
  private buildPreviewLabel(
    contentType: string,
    content: string,
    viewOnce?: boolean,
    interactiveData?: InteractiveMessageData
  ): string {
    if (viewOnce) return '[View Once Media]';
    if (interactiveData) {
      if (interactiveData.kind === 'poll') return `Poll: ${interactiveData.question || content}`;
      if (interactiveData.kind === 'quiz') return `Quiz: ${interactiveData.question || content}`;
      if (interactiveData.kind === 'voting_card') return `Vote: ${interactiveData.question || content}`;
      if (interactiveData.kind === 'event') return `Event: ${interactiveData.event?.title || content}`;
      if (interactiveData.kind === 'checklist') return `Checklist: ${interactiveData.question || 'Items'}`;
      if (interactiveData.kind === 'location') return `Location: ${interactiveData.location?.label || 'Shared location'}`;
      if (interactiveData.kind === 'contact') return `Contact: ${interactiveData.contact?.displayName || 'Shared contact'}`;
      if (interactiveData.kind === 'task') return `Task: ${interactiveData.task?.title || 'Assigned task'}`;
    }
    if (contentType === 'text') return content;
    return `[${contentType}]`;
  }

  formatMessageSummary(
    m: IMessageDocument | any,
    viewerId: string,
    savedInfo?: { isImportant: boolean }
  ): MessageSummary {
    const sender = m.senderId as any;
    const senderId = sender?._id?.toString() || sender?.toString() || '';
    const isViewerRecipient = senderId !== viewerId;
    const hasViewed = m.viewedBy && m.viewedBy.some((v: any) => v.userId?.toString() === viewerId);
    const isViewOnceExpiredForUser = Boolean(
      m.viewOnce && (m.isExpired || (isViewerRecipient && hasViewed))
    );

    const secretReactions = (m.secretReactions || []).map((sr: any) => {
      const srUserId = sr.userId?._id?.toString() || sr.userId?.toString() || '';
      const revealedList: string[] = (sr.revealedToUserIds || []).map((id: any) => id.toString());
      const isRevealed = srUserId === viewerId || revealedList.includes(viewerId);
      return {
        userId: srUserId,
        emoji: isRevealed ? sr.emoji : '🔒',
        isRevealed,
        createdAt: sr.createdAt?.toISOString() || new Date().toISOString(),
      };
    });

    return {
      id: m._id.toString(),
      conversationId: m.conversationId.toString(),
      senderId,
      sender: {
        id: senderId,
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
      forwardedFrom:
        m.forwardedFrom && m.forwardedFrom.messageId
          ? {
              messageId: m.forwardedFrom.messageId.toString(),
              senderDisplayName: m.forwardedFrom.senderDisplayName,
              conversationId: m.forwardedFrom.conversationId?.toString(),
            }
          : undefined,
      reactions: (m.reactions || []).map((r: any) => ({
        userId: r.userId?._id?.toString() || r.userId?.toString(),
        emoji: r.emoji,
        createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
      })),
      secretReactions: secretReactions.length > 0 ? secretReactions : undefined,
      interactiveData: m.isDeleted ? undefined : m.interactiveData,
      translations: m.translations,
      voiceTranscript: m.voiceTranscript,
      receipts: (m.receipts || []).map((rc: any) => ({
        userId: rc.userId.toString(),
        status: rc.status,
        updatedAt: rc.updatedAt?.toISOString() || new Date().toISOString(),
      })),
      isEdited: Boolean(m.isEdited),
      isDeleted: Boolean(m.isDeleted),
      isPinned: Boolean(m.isPinned),
      pinnedAt: m.pinnedAt?.toISOString(),
      pinnedBy: m.pinnedBy?.toString(),
      isScheduled: Boolean(m.isScheduled),
      scheduledFor: m.scheduledFor?.toISOString(),
      scheduleStatus: m.scheduleStatus,
      isSavedByMe: Boolean(savedInfo),
      isImportant: Boolean(savedInfo?.isImportant),
      expiresAt: m.expiresAt?.toISOString(),
      disappearingMode: m.disappearingMode,
      viewOnce: Boolean(m.viewOnce),
      viewedAt: m.viewedAt?.toISOString(),
      isExpired: Boolean(m.isExpired),
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
  }

  async getConversations(userId: string): Promise<ConversationSummary[]> {
    const [conversations, folders, drafts, streakMap] = await Promise.all([
      Conversation.find({ participants: userId })
        .populate('participants', 'username displayName avatarUrl isVerified isOnline lastSeen')
        .populate('lastMessage.senderId', 'username displayName avatarUrl')
        .sort({ updatedAt: -1 }),
      ChatFolder.find({ userId }),
      ConversationDraft.find({ userId }),
      streakService.getStreakMapByPartner(userId),
    ]);

    const folderMap = new Map<string, string[]>();
    for (const folder of folders) {
      const fId = folder._id.toString();
      for (const cId of folder.conversationIds) {
        const key = cId.toString();
        folderMap.set(key, [...(folderMap.get(key) || []), fId]);
      }
    }

    const draftMap = new Map(drafts.map((d) => [d.conversationId.toString(), d.content]));
    const summaries: ConversationSummary[] = [];

    for (const conv of conversations) {
      const convId = conv._id.toString();
      const participants = (conv.participants as any[]).map((p) => ({
        id: p._id.toString(),
        username: p.username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        isVerified: p.isVerified,
        isOnline: p.isOnline,
        lastSeen: p.lastSeen?.toISOString(),
      }));

      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        senderId: { $ne: userId },
        isScheduled: { $ne: true },
        'receipts.userId': { $ne: userId },
      });

      let title = conv.title || '';
      let avatarUrl = conv.avatarUrl;
      let streak;

      if (conv.type === 'direct') {
        const other = participants.find((p) => p.id !== userId);
        if (other) {
          title = other.displayName;
          avatarUrl = other.avatarUrl;
          streak = streakMap.get(other.id);
        }
      }

      summaries.push({
        id: convId,
        type: conv.type,
        title,
        avatarUrl,
        participants,
        lastMessage: conv.lastMessage
          ? {
              id: conv.lastMessage.id?.toString() || '',
              conversationId: convId,
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
        isPriority: (conv.priorityBy || []).some((id) => id.toString() === userId),
        isArchived: (conv.archivedBy || []).some((id) => id.toString() === userId),
        folderIds: folderMap.get(convId) || [],
        draftContent: draftMap.get(convId),
        streak,
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
      isScheduled: { $ne: true },
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

    const savedRecords = await SavedMessage.find({
      userId,
      messageId: { $in: items.map((i) => i._id) },
    }).select('messageId isImportant');
    const savedMap = new Map(
      savedRecords.map((s) => [s.messageId.toString(), { isImportant: s.isImportant }])
    );

    const formattedItems: MessageSummary[] = items.map((m) =>
      this.formatMessageSummary(m, userId, savedMap.get(m._id.toString()))
    );

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

    // Handle disappearing rules (both private rooms and explicit per-message timer)
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
    } else if (input.disappearingMode && input.disappearingMode !== 'off') {
      disappearingMode = input.disappearingMode;
    }

    if (isViewOnce) {
      disappearingMode = 'after_view';
    } else if (disappearingMode === '24h') {
      expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    } else if (disappearingMode === '7d') {
      expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    }

    let scheduledForDate: Date | undefined;
    let isFutureSchedule = false;
    if (input.scheduledFor) {
      scheduledForDate = new Date(input.scheduledFor);
      if (Number.isNaN(scheduledForDate.getTime())) {
        throw new Error('Invalid scheduledFor timestamp');
      }
      isFutureSchedule = scheduledForDate.getTime() > Date.now() + 2000;
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
      interactiveData: input.interactiveData,
      clientTempId: input.clientTempId,
      metadata: input.metadata,
      receipts: [{ userId: senderId, status: 'sent', updatedAt: new Date() }],
      viewOnce: isViewOnce,
      disappearingMode,
      mediaSavePolicy,
      expiresAt,
      isExpired: false,
      isScheduled: isFutureSchedule,
      scheduledFor: scheduledForDate,
      scheduleStatus: isFutureSchedule ? 'pending' : undefined,
    });
    await message.save();

    if (!isFutureSchedule) {
      conv.lastMessage = {
        id: message._id,
        senderId: new mongoose.Types.ObjectId(senderId),
        content: this.buildPreviewLabel(
          input.contentType,
          input.content,
          isViewOnce,
          input.interactiveData
        ),
        contentType: input.contentType,
        createdAt: message.createdAt,
      };
      await conv.save();
      await ConversationDraft.deleteOne({ userId: senderId, conversationId: conv._id });
      streakService.recordDirectInteraction(senderId, conv).catch((err) => {
        logger.warn('Failed to update friend streak', 'ChatService', err);
      });
    }

    await message.populate('senderId', 'username displayName avatarUrl isVerified');
    const summary = this.formatMessageSummary(message, senderId);

    if (!isFutureSchedule) {
      const io = getIO();
      if (io) {
        io.to(`conversation:${conv._id}`).emit(SOCKET_EVENTS.NEW_MESSAGE, summary);
      }
    }

    return summary;
  }

  async editMessage(messageId: string, userId: string, input: EditMessageInput): Promise<MessageSummary> {
    const msg = await Message.findById(messageId).populate('senderId', 'username displayName avatarUrl isVerified');
    if (!msg) throw new Error('Message not found');
    if (msg.senderId._id ? msg.senderId._id.toString() !== userId : msg.senderId.toString() !== userId) {
      throw new Error('Permission denied: You can only edit your own messages');
    }
    if (msg.isDeleted) throw new Error('Cannot edit a deleted message');

    msg.content = input.content;
    msg.isEdited = true;
    await msg.save();

    return this.formatMessageSummary(msg, userId);
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

  // --- ADVANCED MESSAGING UPGRADES ---

  async pinMessage(messageId: string, userId: string, pinned: boolean): Promise<MessageSummary> {
    const msg = await Message.findById(messageId).populate('senderId', 'username displayName avatarUrl isVerified');
    if (!msg || msg.isDeleted) throw new Error('Message not found');

    const isParticipant = await Conversation.exists({ _id: msg.conversationId, participants: userId });
    if (!isParticipant) throw new Error('Access denied: Not a conversation participant');

    msg.isPinned = pinned;
    msg.pinnedAt = pinned ? new Date() : undefined;
    msg.pinnedBy = pinned ? new mongoose.Types.ObjectId(userId) : undefined;
    await msg.save();

    const summary = this.formatMessageSummary(msg, userId);
    const io = getIO();
    if (io) {
      io.to(`conversation:${msg.conversationId}`).emit(SOCKET_EVENTS.MESSAGE_PINNED, {
        conversationId: msg.conversationId.toString(),
        messageId: msg._id.toString(),
        isPinned: pinned,
        pinnedBy: userId,
        pinnedAt: msg.pinnedAt?.toISOString(),
      });
    }

    return summary;
  }

  private cloneInteractiveForForward(data?: InteractiveMessageData): InteractiveMessageData | undefined {
    if (!data) return undefined;
    return {
      ...data,
      options: data.options?.map((o) => ({ ...o, voterIds: [] })),
      checklistItems: data.checklistItems?.map((item) => ({ ...item, completed: false, completedBy: undefined })),
      event: data.event
        ? { ...data.event, rsvpGoingIds: [], rsvpMaybeIds: [], rsvpDeclinedIds: [] }
        : undefined,
    };
  }

  async forwardMessage(
    messageId: string,
    userId: string,
    targetConversationIds: string[]
  ): Promise<MessageSummary[]> {
    const srcMsg = await Message.findById(messageId).populate('senderId', 'displayName username');
    if (!srcMsg || srcMsg.isDeleted || srcMsg.isExpired) {
      throw new Error('Source message not available for forwarding');
    }
    if (srcMsg.viewOnce) {
      throw new Error('View-once messages cannot be forwarded');
    }

    const srcMember = await Conversation.exists({ _id: srcMsg.conversationId, participants: userId });
    if (!srcMember) throw new Error('Access denied to source message');

    const forwardedItems: MessageSummary[] = [];
    const originalSenderName =
      (srcMsg.senderId as any)?.displayName || (srcMsg.senderId as any)?.username || 'User';

    for (const targetConvId of targetConversationIds) {
      const targetConv = await Conversation.findOne({ _id: targetConvId, participants: userId });
      if (!targetConv) {
        throw new Error(`Access denied to target conversation ${targetConvId}`);
      }

      const cloned = new Message({
        conversationId: targetConv._id,
        senderId: userId,
        contentType: srcMsg.contentType,
        content: srcMsg.content,
        attachments: srcMsg.attachments,
        interactiveData: this.cloneInteractiveForForward(srcMsg.interactiveData),
        forwardedFrom: {
          messageId: srcMsg._id,
          senderDisplayName: originalSenderName,
          conversationId: srcMsg.conversationId,
        },
        receipts: [{ userId, status: 'sent', updatedAt: new Date() }],
      });
      await cloned.save();

      targetConv.lastMessage = {
        id: cloned._id,
        senderId: new mongoose.Types.ObjectId(userId),
        content: this.buildPreviewLabel(
          cloned.contentType,
          cloned.content,
          false,
          cloned.interactiveData
        ),
        contentType: cloned.contentType,
        createdAt: cloned.createdAt,
      };
      await targetConv.save();

      await cloned.populate('senderId', 'username displayName avatarUrl isVerified');
      const summary = this.formatMessageSummary(cloned, userId);
      forwardedItems.push(summary);

      const io = getIO();
      if (io) {
        io.to(`conversation:${targetConvId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, summary);
      }
    }

    return forwardedItems;
  }

  async interactWithMessage(
    messageId: string,
    userId: string,
    input: InteractMessageInput
  ): Promise<MessageSummary> {
    const msg = await Message.findById(messageId).populate('senderId', 'username displayName avatarUrl isVerified');
    if (!msg || msg.isDeleted || !msg.interactiveData) {
      throw new Error('Interactive message not found');
    }

    const isMember = await Conversation.exists({ _id: msg.conversationId, participants: userId });
    if (!isMember) throw new Error('Access denied: Not a participant');

    const data: InteractiveMessageData = JSON.parse(JSON.stringify(msg.interactiveData));

    if (input.action === 'vote' && data.options) {
      if (!input.optionId) throw new Error('optionId is required for vote');
      const target = data.options.find((o) => o.id === input.optionId);
      if (!target) throw new Error('Poll option not found');

      if (!data.allowMultiple) {
        for (const opt of data.options) {
          opt.voterIds = opt.voterIds.filter((id) => id !== userId);
        }
        target.voterIds.push(userId);
      } else {
        const exists = target.voterIds.includes(userId);
        target.voterIds = exists
          ? target.voterIds.filter((id) => id !== userId)
          : [...target.voterIds, userId];
      }
    } else if (input.action === 'toggle_checklist' && data.checklistItems) {
      const item = data.checklistItems.find((i) => i.id === input.itemId);
      if (!item) throw new Error('Checklist item not found');
      item.completed = !item.completed;
      item.completedBy = item.completed ? userId : undefined;
    } else if (input.action === 'rsvp' && data.event && input.rsvpStatus) {
      data.event.rsvpGoingIds = data.event.rsvpGoingIds.filter((id) => id !== userId);
      data.event.rsvpMaybeIds = data.event.rsvpMaybeIds.filter((id) => id !== userId);
      data.event.rsvpDeclinedIds = data.event.rsvpDeclinedIds.filter((id) => id !== userId);
      if (input.rsvpStatus === 'going') data.event.rsvpGoingIds.push(userId);
      else if (input.rsvpStatus === 'maybe') data.event.rsvpMaybeIds.push(userId);
      else data.event.rsvpDeclinedIds.push(userId);
    } else if (input.action === 'update_task' && data.task && input.taskStatus) {
      data.task.status = input.taskStatus;
    } else {
      throw new Error('Unsupported interactive action for this message');
    }

    msg.interactiveData = data;
    msg.markModified('interactiveData');
    await msg.save();

    const io = getIO();
    if (io) {
      io.to(`conversation:${msg.conversationId}`).emit(SOCKET_EVENTS.MESSAGE_INTERACTIVE_UPDATED, {
        conversationId: msg.conversationId.toString(),
        messageId: msg._id.toString(),
        interactiveData: data,
      });
    }

    return this.formatMessageSummary(msg, userId);
  }

  async addSecretReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<MessageSummary> {
    const msg = await Message.findById(messageId).populate('senderId', 'username displayName avatarUrl isVerified');
    if (!msg || msg.isDeleted) throw new Error('Message not found');

    const isMember = await Conversation.exists({ _id: msg.conversationId, participants: userId });
    if (!isMember) throw new Error('Access denied: Not a participant');

    msg.secretReactions = (msg.secretReactions || []).filter((sr) => sr.userId.toString() !== userId);
    msg.secretReactions.push({
      userId: new mongoose.Types.ObjectId(userId),
      emoji,
      revealedToUserIds: [new mongoose.Types.ObjectId(userId)],
      createdAt: new Date(),
    });
    await msg.save();

    const io = getIO();
    if (io) {
      io.to(`conversation:${msg.conversationId}`).emit(SOCKET_EVENTS.MESSAGE_SECRET_REACTION, {
        conversationId: msg.conversationId.toString(),
        messageId: msg._id.toString(),
        reactorUserId: userId,
        isSecret: true,
      });
    }

    return this.formatMessageSummary(msg, userId);
  }

  async revealSecretReaction(messageId: string, userId: string): Promise<MessageSummary> {
    const msg = await Message.findById(messageId).populate('senderId', 'username displayName avatarUrl isVerified');
    if (!msg || msg.isDeleted) throw new Error('Message not found');

    const msgSenderId = (msg.senderId as any)?._id?.toString() || msg.senderId.toString();
    const conv = await Conversation.findOne({ _id: msg.conversationId, participants: userId });
    if (!conv) throw new Error('Access denied: Not a participant');

    if (msgSenderId !== userId && conv.type !== 'direct') {
      throw new Error('Only the message author can unlock secret reactions in a group chat');
    }

    const userObjId = new mongoose.Types.ObjectId(userId);
    for (const sr of msg.secretReactions || []) {
      if (!sr.revealedToUserIds.some((id) => id.toString() === userId)) {
        sr.revealedToUserIds.push(userObjId);
      }
    }
    await msg.save();

    return this.formatMessageSummary(msg, userId);
  }

  async getScheduledMessages(conversationId: string, userId: string): Promise<MessageSummary[]> {
    const conv = await Conversation.exists({ _id: conversationId, participants: userId });
    if (!conv) throw new Error('Access denied: You are not a participant in this conversation');

    const docs = await Message.find({
      conversationId,
      senderId: userId,
      isScheduled: true,
      scheduleStatus: 'pending',
    })
      .populate('senderId', 'username displayName avatarUrl isVerified')
      .sort({ scheduledFor: 1 });

    return docs.map((d) => this.formatMessageSummary(d, userId));
  }

  async cancelScheduledMessage(messageId: string, userId: string): Promise<void> {
    const msg = await Message.findOne({
      _id: messageId,
      senderId: userId,
      isScheduled: true,
      scheduleStatus: 'pending',
    });
    if (!msg) throw new Error('Pending scheduled message not found');

    msg.scheduleStatus = 'cancelled';
    await msg.save();
  }

  async translateMessage(
    messageId: string,
    userId: string,
    targetLang = 'en'
  ): Promise<{
    messageId: string;
    translatedText: string;
    targetLang: string;
    detectedSourceLang: string;
    provider: string;
    note?: string;
  }> {
    const msg = await Message.findById(messageId);
    if (!msg || msg.isDeleted) throw new Error('Message not found');

    const isMember = await Conversation.exists({ _id: msg.conversationId, participants: userId });
    if (!isMember) throw new Error('Access denied');

    const result = await translationService.translateText(msg.content || '', targetLang);
    msg.translations = {
      ...(msg.translations || {}),
      [result.targetLang]: result.translatedText,
    };
    msg.markModified('translations');
    await msg.save();

    return {
      messageId: msg._id.toString(),
      ...result,
    };
  }

  async transcribeVoiceMessage(
    messageId: string,
    userId: string
  ): Promise<{
    messageId: string;
    status: 'available' | 'unconfigured';
    text: string;
    note?: string;
  }> {
    const msg = await Message.findById(messageId);
    if (!msg || msg.isDeleted) throw new Error('Message not found');

    const isMember = await Conversation.exists({ _id: msg.conversationId, participants: userId });
    if (!isMember) throw new Error('Access denied');

    // Never fabricate a transcript when no Speech-to-Text engine is configured
    const sttEndpoint = process.env.STT_API_URL;
    if (!sttEndpoint) {
      const result = {
        status: 'unconfigured' as const,
        text: '',
        note: 'External Speech-to-Text engine is not configured (set STT_API_URL to enable automatic voice transcription).',
      };
      msg.voiceTranscript = result;
      await msg.save();
      return { messageId: msg._id.toString(), ...result };
    }

    const audioAttachment = (msg.attachments || []).find((a) => a.type === 'audio');
    if (!audioAttachment) {
      throw new Error('Message does not contain an audio attachment');
    }

    const response = await fetch(`${sttEndpoint.replace(/\/$/, '')}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioUrl: audioAttachment.url }),
    });
    if (!response.ok) {
      throw new Error(`Speech-to-Text service returned ${response.status}`);
    }
    const payload = (await response.json()) as { text?: string };
    const result = {
      status: 'available' as const,
      text: payload.text || '',
    };
    msg.voiceTranscript = result;
    await msg.save();
    return { messageId: msg._id.toString(), ...result };
  }

  async deliverDueScheduledMessages(now = new Date()): Promise<number> {
    const dueMessages = await Message.find({
      isScheduled: true,
      scheduleStatus: 'pending',
      scheduledFor: { $lte: now },
      isDeleted: false,
    })
      .populate('senderId', 'username displayName avatarUrl isVerified')
      .limit(100);

    if (dueMessages.length === 0) return 0;

    let delivered = 0;
    const io = getIO();

    for (const msg of dueMessages) {
      try {
        await Message.updateOne(
          { _id: msg._id },
          {
            $set: {
              isScheduled: false,
              scheduleStatus: 'delivered',
              createdAt: now,
              updatedAt: now,
            },
          }
        );
        msg.isScheduled = false;
        msg.scheduleStatus = 'delivered';
        msg.createdAt = now;
        msg.updatedAt = now;

        const conv = await Conversation.findById(msg.conversationId);
        if (conv) {
          conv.lastMessage = {
            id: msg._id,
            senderId: msg.senderId._id ? msg.senderId._id : msg.senderId,
            content: this.buildPreviewLabel(
              msg.contentType,
              msg.content,
              msg.viewOnce,
              msg.interactiveData
            ),
            contentType: msg.contentType,
            createdAt: now,
          };
          await conv.save();
          const senderIdStr = (msg.senderId as any)?._id?.toString() || msg.senderId.toString();
          await streakService.recordDirectInteraction(senderIdStr, conv, now);
        }

        const senderIdStr = (msg.senderId as any)?._id?.toString() || msg.senderId.toString();
        const summary = this.formatMessageSummary(msg, senderIdStr);
        if (io) {
          io.to(`conversation:${msg.conversationId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, summary);
        }
        delivered++;
      } catch (err) {
        logger.error(`Error delivering scheduled message ${msg._id}`, 'ChatService', err);
      }
    }

    return delivered;
  }

  async triggerDueReminders(now = new Date()): Promise<number> {
    const dueReminders = await MessageReminder.find({
      status: 'pending',
      remindAt: { $lte: now },
    }).limit(100);

    if (dueReminders.length === 0) return 0;

    let count = 0;
    const io = getIO();

    for (const reminder of dueReminders) {
      try {
        reminder.status = 'triggered';
        await reminder.save();

        await Notification.create({
          recipientId: reminder.userId,
          actorId: reminder.userId,
          type: 'message',
          title: 'Message Reminder',
          body: reminder.note || reminder.messagePreview || 'Reminder for saved message',
          data: {
            conversationId: reminder.conversationId.toString(),
            messageId: reminder.messageId.toString(),
            reminderId: reminder._id.toString(),
          },
        });

        if (io) {
          io.to(`user:${reminder.userId}`).emit(SOCKET_EVENTS.REMINDER_TRIGGERED, {
            id: reminder._id.toString(),
            messageId: reminder.messageId.toString(),
            conversationId: reminder.conversationId.toString(),
            note: reminder.note,
            messagePreview: reminder.messagePreview,
            remindAt: reminder.remindAt.toISOString(),
          });
        }
        count++;
      } catch (err) {
        logger.error(`Error triggering reminder ${reminder._id}`, 'ChatService', err);
      }
    }

    return count;
  }
}

export const chatService = new ChatService();

