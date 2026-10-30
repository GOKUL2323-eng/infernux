import { create } from 'zustand';
import {
  api,
  setAuthTokens,
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  saveLastAccount,
  API_BASE_URL,
} from '../api/client';
import { socketClient } from '../socket/socketClient';
import { useChatStore } from './useChatStore';
import { useFeedStore } from './useFeedStore';
import {
  UserProfile,
  RegisterInput,
  LoginInput,
  AuthResponse,
  SendPhoneOtpInput,
  VerifyPhoneOtpInput,
  PhoneRegisterInput,
  ChangePhoneInput,
  SendPhoneOtpResponse,
} from '@infernux/shared';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (input: LoginInput) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  sendPhoneOtp: (input: SendPhoneOtpInput) => Promise<SendPhoneOtpResponse | null>;
  loginWithPhone: (input: VerifyPhoneOtpInput) => Promise<boolean>;
  registerWithPhone: (input: PhoneRegisterInput) => Promise<boolean>;
  changePhoneNumber: (input: ChangePhoneInput) => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  restoreSession: () => Promise<boolean>;
  updateUser: (updated: Partial<UserProfile>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (input: LoginInput) => {
    set({ isLoading: true, error: null });
    const res = await api.post<AuthResponse>('/auth/login', input);

    if (res.success && res.data) {
      await setAuthTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
      await saveLastAccount({
        username: res.data.user.username,
        displayName: res.data.user.displayName,
        avatarUrl: res.data.user.avatarUrl,
      });
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      socketClient.connect();
      // Hydrate user data immediately
      useChatStore.getState().loadConversations();
      useFeedStore.getState().loadFeed(true);
      useFeedStore.getState().loadStories();
      return true;
    } else {
      set({ error: res.error?.message || 'Login failed', isLoading: false });
      return false;
    }
  },

  register: async (input: RegisterInput) => {
    set({ isLoading: true, error: null });
    const res = await api.post<AuthResponse>('/auth/register', input);

    if (res.success && res.data) {
      await setAuthTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
      await saveLastAccount({
        username: res.data.user.username,
        displayName: res.data.user.displayName,
        avatarUrl: res.data.user.avatarUrl,
      });
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      socketClient.connect();
      // Hydrate user data immediately
      useChatStore.getState().loadConversations();
      useFeedStore.getState().loadFeed(true);
      useFeedStore.getState().loadStories();
      return true;
    } else {
      set({ error: res.error?.message || 'Registration failed', isLoading: false });
      return false;
    }
  },

  sendPhoneOtp: async (input: SendPhoneOtpInput) => {
    set({ isLoading: true, error: null });
    const res = await api.post<SendPhoneOtpResponse>('/auth/phone/send-otp', input);
    set({ isLoading: false });
    if (res.success && res.data) {
      return res.data;
    } else {
      set({ error: res.error?.message || 'Failed to send OTP' });
      return null;
    }
  },

  loginWithPhone: async (input: VerifyPhoneOtpInput) => {
    set({ isLoading: true, error: null });
    const res = await api.post<AuthResponse>('/auth/phone/login', input);

    if (res.success && res.data) {
      await setAuthTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
      await saveLastAccount({
        username: res.data.user.username,
        displayName: res.data.user.displayName,
        avatarUrl: res.data.user.avatarUrl,
      });
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      socketClient.connect();
      useChatStore.getState().loadConversations();
      useFeedStore.getState().loadFeed(true);
      useFeedStore.getState().loadStories();
      return true;
    } else {
      set({ error: res.error?.message || 'Verification failed', isLoading: false });
      return false;
    }
  },

  registerWithPhone: async (input: PhoneRegisterInput) => {
    set({ isLoading: true, error: null });
    const res = await api.post<AuthResponse>('/auth/phone/register', input);

    if (res.success && res.data) {
      await setAuthTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
      await saveLastAccount({
        username: res.data.user.username,
        displayName: res.data.user.displayName,
        avatarUrl: res.data.user.avatarUrl,
      });
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      socketClient.connect();
      useChatStore.getState().loadConversations();
      useFeedStore.getState().loadFeed(true);
      useFeedStore.getState().loadStories();
      return true;
    } else {
      set({ error: res.error?.message || 'Registration failed', isLoading: false });
      return false;
    }
  },

  changePhoneNumber: async (input: ChangePhoneInput) => {
    set({ isLoading: true, error: null });
    const res = await api.patch<UserProfile>('/auth/phone/change', input);
    if (res.success && res.data) {
      set({ user: res.data, isLoading: false });
      return true;
    } else {
      set({ error: res.error?.message || 'Failed to update phone number', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    await clearAuthTokens();
    socketClient.disconnect();
    useChatStore.getState().reset();
    useFeedStore.getState().reset();
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  deleteAccount: async () => {
    try {
      await api.delete('/auth/account');
    } catch {
      // ignore
    }
    await clearAuthTokens();
    socketClient.disconnect();
    useChatStore.getState().reset();
    useFeedStore.getState().reset();
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    return true;
  },

  restoreSession: async () => {
    let token = await getAccessToken();

    // If access token is absent or potentially expired, attempt refresh first
    if (!token) {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData.success && refreshData.data) {
              await setAuthTokens(refreshData.data.accessToken, refreshData.data.refreshToken);
              token = refreshData.data.accessToken;
            }
          }
        } catch {
          // ignore
        }
      }
    }

    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return false;
    }

    const res = await api.get<UserProfile>('/auth/me');
    if (res.success && res.data) {
      await saveLastAccount({
        username: res.data.username,
        displayName: res.data.displayName,
        avatarUrl: res.data.avatarUrl,
      });
      set({ user: res.data, isAuthenticated: true, isLoading: false });
      socketClient.connect();
      useChatStore.getState().loadConversations();
      useFeedStore.getState().loadFeed(true);
      useFeedStore.getState().loadStories();
      return true;
    } else {
      await clearAuthTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  updateUser: (updated: Partial<UserProfile>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updated } : null,
    }));
  },
}));

