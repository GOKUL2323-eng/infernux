import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { ChatFolder } from '../models/ChatFolder';
import { MessageReminder } from '../models/MessageReminder';
import { ConversationDraft } from '../models/ConversationDraft';
import { SavedMessage } from '../models/SavedMessage';
import { getIO } from '../sockets';
import {
  ChatFolderSummary,
  CreateChatFolderInput,
  CreateReminderInput,
  MessageReminderSummary,
  MessageSummary,
  SavedMessageCollectionItem,
  SavePersonalMessageInput,
  SOCKET_EVENTS,
  UpdateConversationPrefsInput,
} from '@infernux/shared';

export class ChatOrganizationService {
  private buildMessagePreview(content: string, contentType: string): string {
    if (content && content.trim().length > 0) {
      return content.trim().slice(0, 140);
    }
    return `[${contentType}]`;
  }

  // --- CONVERSATION PREFERENCES ---

  async updateConversationPreferences(
    conversationId: string,
    userId: string,
    prefs: UpdateConversationPrefsInput
  ): Promise<{
    isPriority: boolean;
    isArchived: boolean;
    isPinned: boolean;
    isMuted: boolean;
    folderIds: string[];
  }> {
    const conv = await Conversation.findOne({ _id: conversationId, participants: userId });
    if (!conv) {
      throw new Error('Conversation not found or access denied');
    }

    const userObjId = new mongoose.Types.ObjectId(userId);
    const toggleMember = (arr: mongoose.Types.ObjectId[] = [], enabled?: boolean) => {
      if (typeof enabled !== 'boolean') return arr;
      const filtered = arr.filter((id) => id.toString() !== userId);
      if (enabled) filtered.push(userObjId);
      return filtered;
    };

    conv.priorityBy = toggleMember(conv.priorityBy, prefs.isPriority);
    conv.archivedBy = toggleMember(conv.archivedBy, prefs.isArchived);
    conv.pinnedBy = toggleMember(conv.pinnedBy, prefs.isPinned);
    conv.mutedBy = toggleMember(conv.mutedBy, prefs.isMuted);
    await conv.save();

    if (Array.isArray(prefs.folderIds)) {
      const convObjId = new mongoose.Types.ObjectId(conversationId);
      await ChatFolder.updateMany(
        { userId },
        { $pull: { conversationIds: convObjId } }
      );
      if (prefs.folderIds.length > 0) {
        await ChatFolder.updateMany(
          { userId, _id: { $in: prefs.folderIds } },
          { $addToSet: { conversationIds: convObjId } }
        );
      }
    }

    const folders = await ChatFolder.find({ userId, conversationIds: conversationId }).select('_id');
    const result = {
      isPriority: conv.priorityBy.some((id) => id.toString() === userId),
      isArchived: conv.archivedBy.some((id) => id.toString() === userId),
      isPinned: conv.pinnedBy.some((id) => id.toString() === userId),
      isMuted: conv.mutedBy.some((id) => id.toString() === userId),
      folderIds: folders.map((f) => f._id.toString()),
    };

    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit(SOCKET_EVENTS.CONVERSATION_PREFS_UPDATED, {
        conversationId,
        ...result,
      });
    }

    return result;
  }

  // --- CHAT FOLDERS ---

  async getFolders(userId: string): Promise<ChatFolderSummary[]> {
    const folders = await ChatFolder.find({ userId }).sort({ order: 1, createdAt: 1 });
    return folders.map((f) => ({
      id: f._id.toString(),
      name: f.name,
      color: f.color,
      icon: f.icon,
      conversationIds: f.conversationIds.map((id) => id.toString()),
      order: f.order,
      createdAt: f.createdAt.toISOString(),
    }));
  }

  async createFolder(userId: string, input: CreateChatFolderInput): Promise<ChatFolderSummary> {
    const count = await ChatFolder.countDocuments({ userId });
    const folder = new ChatFolder({
      userId,
      name: input.name.trim(),
      color: input.color || '#A020F0',
      icon: input.icon || 'folder-outline',
      conversationIds: input.conversationIds || [],
      order: count,
    });
    await folder.save();

    return {
      id: folder._id.toString(),
      name: folder.name,
      color: folder.color,
      icon: folder.icon,
      conversationIds: folder.conversationIds.map((id) => id.toString()),
      order: folder.order,
      createdAt: folder.createdAt.toISOString(),
    };
  }

  async updateFolder(
    userId: string,
    folderId: string,
    input: Partial<CreateChatFolderInput>
  ): Promise<ChatFolderSummary> {
    const folder = await ChatFolder.findOne({ _id: folderId, userId });
    if (!folder) throw new Error('Folder not found');

    if (input.name !== undefined) folder.name = input.name.trim();
    if (input.color !== undefined) folder.color = input.color;
    if (input.icon !== undefined) folder.icon = input.icon;
    if (input.conversationIds !== undefined) {
      folder.conversationIds = input.conversationIds.map((id) => new mongoose.Types.ObjectId(id));
    }
    await folder.save();

    return {
      id: folder._id.toString(),
      name: folder.name,
      color: folder.color,
      icon: folder.icon,
      conversationIds: folder.conversationIds.map((id) => id.toString()),
      order: folder.order,
      createdAt: folder.createdAt.toISOString(),
    };
  }

  async deleteFolder(userId: string, folderId: string): Promise<void> {
    const result = await ChatFolder.deleteOne({ _id: folderId, userId });
    if (result.deletedCount === 0) throw new Error('Folder not found');
  }

  // --- CROSS-DEVICE DRAFTS ---

  async getDraft(conversationId: string, userId: string): Promise<string> {
    const conv = await Conversation.exists({ _id: conversationId, participants: userId });
    if (!conv) throw new Error('Access denied: You are not a participant in this conversation');

    const draft = await ConversationDraft.findOne({ userId, conversationId });
    return draft?.content || '';
  }

  async syncDraft(conversationId: string, userId: string, content: string): Promise<string> {
    const conv = await Conversation.exists({ _id: conversationId, participants: userId });
    if (!conv) throw new Error('Access denied: You are not a participant in this conversation');

    const trimmed = content;
    if (!trimmed) {
      await ConversationDraft.deleteOne({ userId, conversationId });
    } else {
      await ConversationDraft.findOneAndUpdate(
        { userId, conversationId },
        { $set: { content: trimmed } },
        { upsert: true, new: true }
      );
    }

    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit(SOCKET_EVENTS.DRAFT_UPDATED, {
        conversationId,
        content: trimmed,
      });
    }

    return trimmed;
  }

  // --- PERSONAL SAVED MESSAGES & IMPORTANT COLLECTIONS ---

  async savePersonalMessage(
    messageId: string,
    userId: string,
    input: SavePersonalMessageInput
  ): Promise<SavedMessageCollectionItem> {
    const msg = await Message.findById(messageId);
    if (!msg || msg.isDeleted) throw new Error('Message not found');

    const isMember = await Conversation.exists({ _id: msg.conversationId, participants: userId });
    if (!isMember) throw new Error('Access denied: You are not a member of this conversation');

    if (msg.viewOnce) {
      throw new Error('View-once messages cannot be saved to personal collections');
    }

    const saved = await SavedMessage.findOneAndUpdate(
      { userId, messageId },
      {
        $set: {
          conversationId: msg.conversationId,
          collectionName: input.collectionName || 'Saved',
          note: input.note,
          isImportant: Boolean(input.isImportant),
        },
      },
      { upsert: true, new: true }
    );

    return {
      id: saved._id.toString(),
      messageId: saved.messageId.toString(),
      conversationId: saved.conversationId.toString(),
      collectionName: saved.collectionName,
      note: saved.note,
      isImportant: saved.isImportant,
      createdAt: saved.createdAt.toISOString(),
    };
  }

  async unsavePersonalMessage(messageId: string, userId: string): Promise<void> {
    await SavedMessage.deleteOne({ userId, messageId });
  }

  async getSavedMessages(
    userId: string,
    options: { collectionName?: string; importantOnly?: boolean } = {},
    formatMessage: (m: any, viewerId: string) => MessageSummary
  ): Promise<SavedMessageCollectionItem[]> {
    const query: any = { userId };
    if (options.collectionName) query.collectionName = options.collectionName;
    if (options.importantOnly) query.isImportant = true;

    const docs = await SavedMessage.find(query).sort({ createdAt: -1 }).limit(100);
    const messageIds = docs.map((d) => d.messageId);

    const msgs = await Message.find({ _id: { $in: messageIds }, isDeleted: false })
      .populate('senderId', 'username displayName avatarUrl isVerified')
      .populate('reactions.userId', 'username displayName avatarUrl');

    const msgMap = new Map(msgs.map((m) => [m._id.toString(), m]));

    return docs
      .filter((d) => msgMap.has(d.messageId.toString()))
      .map((d) => {
        const msgDoc = msgMap.get(d.messageId.toString())!;
        return {
          id: d._id.toString(),
          messageId: d.messageId.toString(),
          conversationId: d.conversationId.toString(),
          collectionName: d.collectionName,
          note: d.note,
          isImportant: d.isImportant,
          message: formatMessage(msgDoc, userId),
          createdAt: d.createdAt.toISOString(),
        };
      });
  }

  // --- MESSAGE REMINDERS ---

  async createReminder(
    messageId: string,
    userId: string,
    input: CreateReminderInput
  ): Promise<MessageReminderSummary> {
    const msg = await Message.findById(messageId);
    if (!msg || msg.isDeleted) throw new Error('Message not found');

    const isMember = await Conversation.exists({ _id: msg.conversationId, participants: userId });
    if (!isMember) throw new Error('Access denied: You are not a member of this conversation');

    const remindAtDate = new Date(input.remindAt);
    if (Number.isNaN(remindAtDate.getTime())) {
      throw new Error('Invalid remindAt timestamp');
    }

    const reminder = new MessageReminder({
      userId,
      messageId: msg._id,
      conversationId: msg.conversationId,
      remindAt: remindAtDate,
      note: input.note,
      messagePreview: this.buildMessagePreview(msg.content, msg.contentType),
      status: 'pending',
    });
    await reminder.save();

    return {
      id: reminder._id.toString(),
      userId: reminder.userId.toString(),
      messageId: reminder.messageId.toString(),
      conversationId: reminder.conversationId.toString(),
      remindAt: reminder.remindAt.toISOString(),
      note: reminder.note,
      status: reminder.status,
      messagePreview: reminder.messagePreview,
      createdAt: reminder.createdAt.toISOString(),
    };
  }

  async getReminders(userId: string): Promise<MessageReminderSummary[]> {
    const docs = await MessageReminder.find({
      userId,
      status: { $ne: 'dismissed' },
    })
      .sort({ remindAt: 1 })
      .limit(100);

    return docs.map((r) => ({
      id: r._id.toString(),
      userId: r.userId.toString(),
      messageId: r.messageId.toString(),
      conversationId: r.conversationId.toString(),
      remindAt: r.remindAt.toISOString(),
      note: r.note,
      status: r.status,
      messagePreview: r.messagePreview,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async dismissReminder(reminderId: string, userId: string): Promise<void> {
    const res = await MessageReminder.findOneAndUpdate(
      { _id: reminderId, userId },
      { $set: { status: 'dismissed' } }
    );
    if (!res) throw new Error('Reminder not found');
  }
}

export const chatOrganizationService = new ChatOrganizationService();

