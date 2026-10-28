import mongoose from 'mongoose';
import { Conversation, IConversationDocument } from '../models/Conversation';
import { Message, IMessageDocument } from '../models/Message';
import { User } from '../models/User';
import {
  SendMessageInput,
  EditMessageInput,
  AddReactionInput,
  CreateConversationInput,
  ConversationSummary,
  MessageSummary,
  PaginatedResponse,
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

    const query: any = { conversationId };
    if (beforeCursor) {
      const cursorMessage = await Message.findById(beforeCursor);
      if (cursorMessage) {
        query.createdAt = { $lt: cursorMessage.createdAt };
      }
    }

    const messages = await Message.find(query)
      .populate('senderId', 'username displayName avatarUrl isVerified')
      .populate('reactions.userId', 'username displayName avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]._id.toString() : null;

    const formattedItems: MessageSummary[] = items.map((m) => {
      const sender = m.senderId as any;
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
        content: m.isDeleted ? 'This message was deleted' : m.content,
        attachments: m.isDeleted ? [] : m.attachments,
        replyTo: m.replyTo
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
    });
    await message.save();

    // Update conversation's last message
    conv.lastMessage = {
      id: message._id,
      senderId: new mongoose.Types.ObjectId(senderId),
      content: input.contentType === 'text' ? input.content : `[${input.contentType}]`,
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
      replyTo: message.replyTo
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
}

export const chatService = new ChatService();

