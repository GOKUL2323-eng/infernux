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

  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, contentType?: any, attachments?: any[]) => Promise<void>;
  receiveMessage: (message: MessageSummary) => void;
  setActiveConversation: (id: string | null) => void;
  setUserTyping: (conversationId: string, username: string, isTyping: boolean) => void;
  createRoom: (input: CreateRoomInput) => Promise<RoomDetails | null>;
  joinRoomByKey: (secretKey: string) => Promise<{ room: RoomDetails; conversationId: string } | null>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversationId: null,
  typingUsers: {},
  isLoading: false,

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

  sendMessage: async (conversationId: string, content: string, contentType = 'text', attachments = []) => {
    const tempId = `temp_${Date.now()}`;
    const payload: SendMessageInput = {
      conversationId,
      content,
      contentType,
      attachments,
      clientTempId: tempId,
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
}));

