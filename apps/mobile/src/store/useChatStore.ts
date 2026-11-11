import { create } from 'zustand';
import { api } from '../api/client';
import { socketClient } from '../socket/socketClient';
import {
  ConversationSummary,
  MessageSummary,
  SendMessageInput,
  PaginatedResponse,
  SOCKET_EVENTS,
  CreateRoomInput,
  RoomDetails,
  ChatFolderSummary,
  MessageReminderSummary,
  SavedMessageCollectionItem,
  FriendStreakSummary,
  InteractiveMessageData,
  InteractMessageInput,
  UpdateConversationPrefsInput,
  DisappearingMode,
} from '@infernux/shared';

interface ChatState {
  conversations: ConversationSummary[];
  messages: Record<string, MessageSummary[]>;
  scheduledMessages: Record<string, MessageSummary[]>;
  folders: ChatFolderSummary[];
  reminders: MessageReminderSummary[];
  savedMessages: SavedMessageCollectionItem[];
  streaks: FriendStreakSummary[];
  drafts: Record<string, string>;
  activeConversationId: string | null;
  typingUsers: Record<string, string[]>;
  isLoading: boolean;
  screenshotAlert: { conversationId?: string; roomId?: string; username: string; displayName: string; timestamp: number } | null;
  destroyedRoomAlert: { roomId: string; conversationId?: string; message: string; leaverName: string } | null;

  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    content: string,
    contentType?: any,
    attachments?: any[],
    viewOnce?: boolean,
    disappearingMode?: DisappearingMode,
    options?: {
      scheduledFor?: string;
      interactiveData?: InteractiveMessageData;
      replyToId?: string;
    }
  ) => Promise<void>;
  receiveMessage: (message: MessageSummary) => void;
  setActiveConversation: (id: string | null) => void;
  setUserTyping: (conversationId: string, username: string, isTyping: boolean) => void;
  createRoom: (input: CreateRoomInput) => Promise<RoomDetails | null>;
  joinRoomByKey: (secretKey: string) => Promise<{ room: RoomDetails; conversationId: string } | null>;
  deleteMessage: (messageId: string, conversationId: string) => Promise<boolean>;
  addReaction: (messageId: string, conversationId: string, emoji: string) => Promise<boolean>;
  editMessage: (messageId: string, conversationId: string, content: string) => Promise<boolean>;
  consumeViewOnce: (messageId: string, conversationId: string) => Promise<boolean>;
  saveMedia: (messageId: string, conversationId: string, mediaUrl: string) => Promise<boolean>;
  pinMessage: (messageId: string, conversationId: string, pinned: boolean) => Promise<boolean>;
  forwardMessage: (messageId: string, targetConversationIds: string[]) => Promise<boolean>;
  interactMessage: (messageId: string, conversationId: string, input: InteractMessageInput) => Promise<boolean>;
  addSecretReaction: (messageId: string, conversationId: string, emoji: string) => Promise<boolean>;
  revealSecretReaction: (messageId: string, conversationId: string) => Promise<boolean>;
  translateMessage: (messageId: string, conversationId: string, targetLang?: string) => Promise<{ translatedText: string; note?: string } | null>;
  transcribeMessage: (messageId: string, conversationId: string) => Promise<{ status: string; text: string; note?: string } | null>;
  loadScheduledMessages: (conversationId: string) => Promise<void>;
  cancelScheduledMessage: (messageId: string, conversationId: string) => Promise<boolean>;
  loadDraft: (conversationId: string) => Promise<string>;
  syncDraft: (conversationId: string, content: string) => Promise<void>;
  loadFolders: () => Promise<void>;
  createFolder: (name: string, color?: string, conversationIds?: string[]) => Promise<ChatFolderSummary | null>;
  deleteFolder: (folderId: string) => Promise<boolean>;
  updateConversationPrefs: (conversationId: string, prefs: UpdateConversationPrefsInput) => Promise<boolean>;
  loadSavedMessages: (importantOnly?: boolean) => Promise<void>;
  savePersonalMessage: (messageId: string, collectionName?: string, isImportant?: boolean) => Promise<boolean>;
  unsavePersonalMessage: (messageId: string) => Promise<boolean>;
  loadReminders: () => Promise<void>;
  createReminder: (messageId: string, remindAt: string, note?: string) => Promise<boolean>;
  dismissReminder: (reminderId: string) => Promise<boolean>;
  loadStreaks: () => Promise<void>;
  recoverStreak: (streakId: string) => Promise<FriendStreakSummary | null>;
  updateStreakSettings: (streakId: string, settings: { remindersEnabled?: boolean; privacyHidden?: boolean }) => Promise<FriendStreakSummary | null>;
  reportScreenshot: (conversationId?: string, roomId?: string) => void;
  clearScreenshotAlert: () => void;
  clearDestroyedRoomAlert: () => void;
  initSocketListeners: () => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  scheduledMessages: {},
  folders: [],
  reminders: [],
  savedMessages: [],
  streaks: [],
  drafts: {},
  activeConversationId: null,
  typingUsers: {},
  isLoading: false,
  screenshotAlert: null,
  destroyedRoomAlert: null,

  reset: () => {
    set({
      conversations: [],
      messages: {},
      scheduledMessages: {},
      folders: [],
      reminders: [],
      savedMessages: [],
      streaks: [],
      drafts: {},
      activeConversationId: null,
      typingUsers: {},
      isLoading: false,
      screenshotAlert: null,
      destroyedRoomAlert: null,
    });
  },

  clearScreenshotAlert: () => set({ screenshotAlert: null }),
  clearDestroyedRoomAlert: () => set({ destroyedRoomAlert: null }),

  loadConversations: async () => {
    set({ isLoading: true });
    const res = await api.get<ConversationSummary[]>('/chats/conversations');
    if (res.success && res.data) {
      const draftMap: Record<string, string> = {};
      for (const c of res.data) {
        if (c.draftContent) draftMap[c.id] = c.draftContent;
      }
      set((state) => ({
        conversations: res.data!,
        drafts: { ...state.drafts, ...draftMap },
        isLoading: false,
      }));
    } else {
      set({ isLoading: false });
    }
  },

  loadMessages: async (conversationId: string) => {
    socketClient.joinConversation(conversationId);
    const res = await api.get<PaginatedResponse<MessageSummary>>(
      `/chats/conversations/${conversationId}/messages?limit=50`
    );

    if (res.success && res.data) {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: res.data!.items,
        },
      }));
    }
  },

  sendMessage: async (
    conversationId: string,
    content: string,
    contentType = 'text',
    attachments = [],
    viewOnce = false,
    disappearingMode?: DisappearingMode,
    options?: {
      scheduledFor?: string;
      interactiveData?: InteractiveMessageData;
      replyToId?: string;
    }
  ) => {
    const tempId = `temp_${Date.now()}`;
    const payload: SendMessageInput = {
      conversationId,
      content,
      contentType,
      attachments,
      clientTempId: tempId,
      viewOnce,
      disappearingMode,
      scheduledFor: options?.scheduledFor,
      interactiveData: options?.interactiveData,
      replyToId: options?.replyToId,
    };

    const res = await api.post<MessageSummary>(`/chats/conversations/${conversationId}/messages`, payload);
    if (res.success && res.data) {
      if (res.data.isScheduled) {
        set((state) => ({
          scheduledMessages: {
            ...state.scheduledMessages,
            [conversationId]: [...(state.scheduledMessages[conversationId] || []), res.data!],
          },
        }));
      } else {
        get().receiveMessage(res.data);
        set((state) => {
          const nextDrafts = { ...state.drafts };
          delete nextDrafts[conversationId];
          return { drafts: nextDrafts };
        });
      }
    }
  },

  receiveMessage: (message: MessageSummary) => {
    const convId = message.conversationId;
    set((state) => {
      const existing = state.messages[convId] || [];
      // Prevent duplicates
      if (existing.some((m) => m.id === message.id)) {
        return state;
      }

      // Update conversations list lastMessage
      const updatedConvs = state.conversations.map((c) => {
        if (c.id === convId) {
          return {
            ...c,
            lastMessage: message,
            updatedAt: message.createdAt,
          };
        }
        return c;
      });

      return {
        messages: {
          ...state.messages,
          [convId]: [...existing, message],
        },
        conversations: updatedConvs,
      };
    });
  },

  setActiveConversation: (id: string | null) => {
    const prev = get().activeConversationId;
    if (prev && prev !== id) {
      socketClient.leaveConversation(prev);
    }
    set({ activeConversationId: id });
    if (id) {
      socketClient.joinConversation(id);
      socketClient.sendReadReceipt(id);
    }
  },

  setUserTyping: (conversationId: string, username: string, isTyping: boolean) => {
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      const updated = isTyping
        ? Array.from(new Set([...current, username]))
        : current.filter((u) => u !== username);

      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: updated,
        },
      };
    });
  },

  createRoom: async (input: CreateRoomInput) => {
    const res = await api.post<{ room: RoomDetails; key: any }>('/rooms', input);
    if (res.success && res.data) {
      await get().loadConversations();
      return res.data.room;
    }
    return null;
  },

  joinRoomByKey: async (secretKey: string) => {
    const res = await api.post<{ room: RoomDetails; conversationId: string }>('/rooms/join', { secretKey });
    if (res.success && res.data) {
      await get().loadConversations();
      return res.data;
    }
    return null;
  },

  deleteMessage: async (messageId: string, conversationId: string) => {
    const res = await api.delete(`/chats/messages/${messageId}`);
    if (res.success) {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).filter((m) => m.id !== messageId),
        },
      }));
      return true;
    }
    return false;
  },

  addReaction: async (messageId: string, conversationId: string, emoji: string) => {
    const res = await api.post(`/chats/messages/${messageId}/reactions`, { emoji });
    if (res.success) {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) => {
            if (m.id === messageId) {
              const existingReactions = m.reactions || [];
              return {
                ...m,
                reactions: [...existingReactions, { userId: 'me', emoji, createdAt: new Date().toISOString() }],
              };
            }
            return m;
          }),
        },
      }));
      return true;
    }
    return false;
  },

  editMessage: async (messageId: string, conversationId: string, content: string) => {
    const res = await api.patch<MessageSummary>(`/chats/messages/${messageId}`, { content });
    if (res.success && res.data) {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) =>
            m.id === messageId ? { ...m, content, isEdited: true } : m
          ),
        },
      }));
      return true;
    }
    return false;
  },

  consumeViewOnce: async (messageId: string, conversationId: string) => {
    // Immediately update local message to Opened/Expired
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.id === messageId
            ? { ...m, isExpired: true, content: 'Opened', attachments: [] }
            : m
        ),
      },
    }));

    const res = await api.post(`/chats/messages/${messageId}/consume-view-once`);
    return res.success;
  },

  saveMedia: async (messageId: string, conversationId: string, mediaUrl: string) => {
    const res = await api.post(`/chats/messages/${messageId}/save-media`, { mediaUrl });
    if (res.success) {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) => {
            if (m.id === messageId) {
              const currentSaved = m.savedBy || [];
              return {
                ...m,
                savedBy: [...currentSaved, { userId: 'me', savedAt: new Date().toISOString() }],
              };
            }
            return m;
          }),
        },
      }));
      return true;
    }
    return false;
  },

  reportScreenshot: (conversationId?: string, roomId?: string) => {
    const socket = socketClient.getSocket();
    if (socket) {
      socket.emit(SOCKET_EVENTS.SCREENSHOT_DETECTED, { conversationId, roomId });
    }
  },

  pinMessage: async (messageId: string, conversationId: string, pinned: boolean) => {
    const res = await api.post<MessageSummary>(`/chats/messages/${messageId}/pin`, { pinned });
    if (res.success && res.data) {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) =>
            m.id === messageId ? res.data! : m
          ),
        },
      }));
      return true;
    }
    return false;
  },

  forwardMessage: async (messageId: string, targetConversationIds: string[]) => {
    const res = await api.post<MessageSummary[]>(`/chats/messages/${messageId}/forward`, {
      targetConversationIds,
    });
    if (res.success && res.data) {
      res.data.forEach((m) => get().receiveMessage(m));
      return true;
    }
    return false;
  },

  interactMessage: async (messageId: string, conversationId: string, input: InteractMessageInput) => {
    const res = await api.post<MessageSummary>(`/chats/messages/${messageId}/interact`, input);
    if (res.success && res.data) {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) =>
            m.id === messageId ? res.data! : m
          ),
        },
      }));
      return true;
    }
    return false;
  },

  addSecretReaction: async (messageId: string, conversationId: string, emoji: string) => {
    const res = await api.post<MessageSummary>(`/chats/messages/${messageId}/secret-reactions`, { emoji });
    if (res.success && res.data) {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) =>
            m.id === messageId ? res.data! : m
          ),
        },
      }));
      return true;
    }
    return false;
  },

  revealSecretReaction: async (messageId: string, conversationId: string) => {
    const res = await api.post<MessageSummary>(`/chats/messages/${messageId}/secret-reactions/reveal`);
    if (res.success && res.data) {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) =>
            m.id === messageId ? res.data! : m
          ),
        },
      }));
      return true;
    }
    return false;
  },

  translateMessage: async (messageId: string, conversationId: string, targetLang = 'en') => {
    const res = await api.post<{ translatedText: string; targetLang: string; note?: string }>(
      `/chats/messages/${messageId}/translate`,
      { targetLang }
    );
    if (res.success && res.data) {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) =>
            m.id === messageId
              ? { ...m, translations: { ...(m.translations || {}), [res.data!.targetLang]: res.data!.translatedText } }
              : m
          ),
        },
      }));
      return { translatedText: res.data.translatedText, note: res.data.note };
    }
    return null;
  },

  transcribeMessage: async (messageId: string, conversationId: string) => {
    const res = await api.post<{ status: 'available' | 'unconfigured'; text: string; note?: string }>(
      `/chats/messages/${messageId}/transcribe`
    );
    if (res.success && res.data) {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) =>
            m.id === messageId ? { ...m, voiceTranscript: res.data! } : m
          ),
        },
      }));
      return res.data;
    }
    return null;
  },

  loadScheduledMessages: async (conversationId: string) => {
    const res = await api.get<MessageSummary[]>(`/chats/conversations/${conversationId}/scheduled`);
    if (res.success && res.data) {
      set((state) => ({
        scheduledMessages: { ...state.scheduledMessages, [conversationId]: res.data! },
      }));
    }
  },

  cancelScheduledMessage: async (messageId: string, conversationId: string) => {
    const res = await api.delete(`/chats/scheduled/${messageId}`);
    if (res.success) {
      set((state) => ({
        scheduledMessages: {
          ...state.scheduledMessages,
          [conversationId]: (state.scheduledMessages[conversationId] || []).filter((m) => m.id !== messageId),
        },
      }));
      return true;
    }
    return false;
  },

  loadDraft: async (conversationId: string) => {
    const res = await api.get<{ conversationId: string; content: string }>(
      `/chats/conversations/${conversationId}/draft`
    );
    if (res.success && res.data) {
      set((state) => ({ drafts: { ...state.drafts, [conversationId]: res.data!.content } }));
      return res.data.content;
    }
    return '';
  },

  syncDraft: async (conversationId: string, content: string) => {
    set((state) => ({ drafts: { ...state.drafts, [conversationId]: content } }));
    await api.put(`/chats/conversations/${conversationId}/draft`, { content });
  },

  loadFolders: async () => {
    const res = await api.get<ChatFolderSummary[]>('/chats/folders');
    if (res.success && res.data) set({ folders: res.data });
  },

  createFolder: async (name: string, color?: string, conversationIds: string[] = []) => {
    const res = await api.post<ChatFolderSummary>('/chats/folders', { name, color, conversationIds });
    if (res.success && res.data) {
      set((state) => ({ folders: [...state.folders, res.data!] }));
      return res.data;
    }
    return null;
  },

  deleteFolder: async (folderId: string) => {
    const res = await api.delete(`/chats/folders/${folderId}`);
    if (res.success) {
      set((state) => ({ folders: state.folders.filter((f) => f.id !== folderId) }));
      return true;
    }
    return false;
  },

  updateConversationPrefs: async (conversationId: string, prefs: UpdateConversationPrefsInput) => {
    const res = await api.patch<{
      isPriority: boolean;
      isArchived: boolean;
      isPinned: boolean;
      isMuted: boolean;
      folderIds: string[];
    }>(`/chats/conversations/${conversationId}/preferences`, prefs);
    if (res.success && res.data) {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, ...res.data! } : c
        ),
      }));
      return true;
    }
    return false;
  },

  loadSavedMessages: async (importantOnly = false) => {
    const q = importantOnly ? '?important=true' : '';
    const res = await api.get<SavedMessageCollectionItem[]>(`/chats/saved-messages${q}`);
    if (res.success && res.data) set({ savedMessages: res.data });
  },

  savePersonalMessage: async (messageId: string, collectionName = 'Saved', isImportant = false) => {
    const res = await api.post<SavedMessageCollectionItem>(
      `/chats/messages/${messageId}/save-personal`,
      { collectionName, isImportant }
    );
    if (res.success) {
      await get().loadSavedMessages();
      return true;
    }
    return false;
  },

  unsavePersonalMessage: async (messageId: string) => {
    const res = await api.delete(`/chats/messages/${messageId}/save-personal`);
    if (res.success) {
      set((state) => ({
        savedMessages: state.savedMessages.filter((s) => s.messageId !== messageId),
      }));
      return true;
    }
    return false;
  },

  loadReminders: async () => {
    const res = await api.get<MessageReminderSummary[]>('/chats/reminders');
    if (res.success && res.data) set({ reminders: res.data });
  },

  createReminder: async (messageId: string, remindAt: string, note?: string) => {
    const res = await api.post<MessageReminderSummary>(
      `/chats/messages/${messageId}/reminders`,
      { remindAt, note }
    );
    if (res.success && res.data) {
      set((state) => ({ reminders: [...state.reminders, res.data!] }));
      return true;
    }
    return false;
  },

  dismissReminder: async (reminderId: string) => {
    const res = await api.delete(`/chats/reminders/${reminderId}`);
    if (res.success) {
      set((state) => ({ reminders: state.reminders.filter((r) => r.id !== reminderId) }));
      return true;
    }
    return false;
  },

  loadStreaks: async () => {
    const res = await api.get<FriendStreakSummary[]>('/chats/streaks');
    if (res.success && res.data) set({ streaks: res.data });
  },

  recoverStreak: async (streakId: string) => {
    const res = await api.post<FriendStreakSummary>(`/chats/streaks/${streakId}/recover`);
    if (res.success && res.data) {
      set((state) => ({
        streaks: state.streaks.map((s) => (s.id === streakId ? res.data! : s)),
        conversations: state.conversations.map((c) =>
          c.streak?.id === streakId ? { ...c, streak: res.data! } : c
        ),
      }));
      return res.data;
    }
    return null;
  },

  updateStreakSettings: async (streakId: string, settings: { remindersEnabled?: boolean; privacyHidden?: boolean }) => {
    const res = await api.patch<FriendStreakSummary>(`/chats/streaks/${streakId}/settings`, settings);
    if (res.success && res.data) {
      set((state) => ({
        streaks: state.streaks.map((s) => (s.id === streakId ? res.data! : s)),
        conversations: state.conversations.map((c) =>
          c.streak?.id === streakId ? { ...c, streak: res.data! } : c
        ),
      }));
      return res.data;
    }
    return null;
  },

  initSocketListeners: () => {
    const socket = socketClient.getSocket();
    if (!socket) return;

    // Avoid multiple registrations
    socket.off(SOCKET_EVENTS.NEW_MESSAGE);
    socket.off(SOCKET_EVENTS.ROOM_DESTROYED);
    socket.off(SOCKET_EVENTS.MESSAGE_CONSUMED);
    socket.off(SOCKET_EVENTS.MESSAGE_EXPIRED);
    socket.off(SOCKET_EVENTS.MEDIA_SAVED);
    socket.off(SOCKET_EVENTS.SCREENSHOT_DETECTED);
    socket.off(SOCKET_EVENTS.USER_TYPING);
    socket.off(SOCKET_EVENTS.MESSAGE_PINNED);
    socket.off(SOCKET_EVENTS.MESSAGE_INTERACTIVE_UPDATED);
    socket.off(SOCKET_EVENTS.DRAFT_UPDATED);
    socket.off(SOCKET_EVENTS.CONVERSATION_PREFS_UPDATED);
    socket.off(SOCKET_EVENTS.STREAK_UPDATED);
    socket.off(SOCKET_EVENTS.REMINDER_TRIGGERED);

    socket.on(SOCKET_EVENTS.MESSAGE_PINNED, (data: { conversationId: string; messageId: string; isPinned: boolean }) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [data.conversationId]: (state.messages[data.conversationId] || []).map((m) =>
            m.id === data.messageId ? { ...m, isPinned: data.isPinned } : m
          ),
        },
      }));
    });

    socket.on(SOCKET_EVENTS.MESSAGE_INTERACTIVE_UPDATED, (data: { conversationId: string; messageId: string; interactiveData: InteractiveMessageData }) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [data.conversationId]: (state.messages[data.conversationId] || []).map((m) =>
            m.id === data.messageId ? { ...m, interactiveData: data.interactiveData } : m
          ),
        },
      }));
    });

    socket.on(SOCKET_EVENTS.DRAFT_UPDATED, (data: { conversationId: string; content: string }) => {
      set((state) => ({
        drafts: { ...state.drafts, [data.conversationId]: data.content },
      }));
    });

    socket.on(SOCKET_EVENTS.CONVERSATION_PREFS_UPDATED, (data: { conversationId: string; isPriority: boolean; isArchived: boolean; isPinned: boolean; isMuted: boolean; folderIds: string[] }) => {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === data.conversationId ? { ...c, ...data } : c
        ),
      }));
    });

    socket.on(SOCKET_EVENTS.STREAK_UPDATED, (streak: FriendStreakSummary) => {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.type === 'direct' && c.participants.some((p) => p.id === streak.partnerId)
            ? { ...c, streak }
            : c
        ),
      }));
    });

    socket.on(SOCKET_EVENTS.REMINDER_TRIGGERED, () => {
      get().loadReminders();
    });

    // 1. Incoming real-time message
    socket.on(SOCKET_EVENTS.NEW_MESSAGE, (message: MessageSummary) => {
      get().receiveMessage(message);
    });

    // 2. Private room destruction event (triggered when any participant leaves)
    socket.on(SOCKET_EVENTS.ROOM_DESTROYED, (data: { roomId: string; conversationId?: string; message: string; leaverName: string }) => {
      set((state) => {
        const remainingConvs = state.conversations.filter(
          (c) => c.roomId !== data.roomId && (!data.conversationId || c.id !== data.conversationId)
        );
        const updatedMessages = { ...state.messages };
        if (data.conversationId) {
          delete updatedMessages[data.conversationId];
        }

        return {
          conversations: remainingConvs,
          messages: updatedMessages,
          destroyedRoomAlert: data,
        };
      });
    });

    // 3. View-once consumed
    socket.on(SOCKET_EVENTS.MESSAGE_CONSUMED, (data: { messageId: string; conversationId: string; viewedByUserId: string }) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [data.conversationId]: (state.messages[data.conversationId] || []).map((m) =>
            m.id === data.messageId
              ? { ...m, isExpired: true, content: 'Opened', attachments: [] }
              : m
          ),
        },
      }));
    });

    // 4. Message expired via background timer
    socket.on(SOCKET_EVENTS.MESSAGE_EXPIRED, (data: { messageId: string; conversationId: string }) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [data.conversationId]: (state.messages[data.conversationId] || []).filter(
            (m) => m.id !== data.messageId
          ),
        },
      }));
    });

    // 5. Media saved alert
    socket.on(SOCKET_EVENTS.MEDIA_SAVED, (data: { messageId: string; conversationId: string; username: string; displayName: string }) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [data.conversationId]: (state.messages[data.conversationId] || []).map((m) =>
            m.id === data.messageId
              ? {
                  ...m,
                  savedBy: [
                    ...(m.savedBy || []),
                    { userId: 'other', username: data.username, savedAt: new Date().toISOString() },
                  ],
                }
              : m
          ),
        },
      }));
    });

    // 6. Screenshot awareness alert
    socket.on(SOCKET_EVENTS.SCREENSHOT_DETECTED, (data: { conversationId?: string; roomId?: string; username: string; displayName: string }) => {
      set({
        screenshotAlert: {
          ...data,
          timestamp: Date.now(),
        },
      });
    });

    // 7. Typing status
    socket.on(SOCKET_EVENTS.USER_TYPING, (data: { conversationId: string; username: string; isTyping: boolean }) => {
      get().setUserTyping(data.conversationId, data.username, data.isTyping);
    });
  },
}));

