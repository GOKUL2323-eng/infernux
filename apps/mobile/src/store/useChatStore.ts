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
} from '@infernux/shared';

interface ChatState {
  conversations: ConversationSummary[];
  messages: Record<string, MessageSummary[]>;
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
    disappearingMode?: any
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
  reportScreenshot: (conversationId?: string, roomId?: string) => void;
  clearScreenshotAlert: () => void;
  clearDestroyedRoomAlert: () => void;
  initSocketListeners: () => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversationId: null,
  typingUsers: {},
  isLoading: false,
  screenshotAlert: null,
  destroyedRoomAlert: null,

  reset: () => {
    set({
      conversations: [],
      messages: {},
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
      set({ conversations: res.data, isLoading: false });
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
    disappearingMode?: any
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
    };

    const res = await api.post<MessageSummary>(`/chats/conversations/${conversationId}/messages`, payload);

    if (res.success && res.data) {
      get().receiveMessage(res.data);
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

