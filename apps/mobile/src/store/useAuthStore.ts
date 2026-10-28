import { create } from 'zustand';
import { api, setAuthTokens, clearAuthTokens, getAccessToken } from '../api/client';
import { socketClient } from '../socket/socketClient';
import { UserProfile, RegisterInput, LoginInput, AuthResponse } from '@infernux/shared';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (input: LoginInput) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  logout: () => Promise<void>;
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
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      socketClient.connect();
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
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      socketClient.connect();
      return true;
    } else {
      set({ error: res.error?.message || 'Registration failed', isLoading: false });
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
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  restoreSession: async () => {
    const token = await getAccessToken();
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return false;
    }

    const res = await api.get<UserProfile>('/auth/me');
    if (res.success && res.data) {
      set({ user: res.data, isAuthenticated: true, isLoading: false });
      socketClient.connect();
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

