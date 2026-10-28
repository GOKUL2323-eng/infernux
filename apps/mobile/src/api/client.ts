import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ApiResponse } from '@infernux/shared';

// For physical device testing, use machine IP or tunnel; default localhost for simulator/web
const DEV_API_URL = Platform.select({
  android: 'http://10.0.2.2:4000/api/v1',
  ios: 'http://localhost:4000/api/v1',
  default: 'http://localhost:4000/api/v1',
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEV_API_URL;

const ACCESS_TOKEN_KEY = 'infernux_access_token';
const REFRESH_TOKEN_KEY = 'infernux_refresh_token';

// In-memory fallback for environments without SecureStore
let inMemoryTokens: { access?: string; refresh?: string } = {};

export async function setAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  inMemoryTokens = { access: accessToken, refresh: refreshToken };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch (err) {
    // ignore
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (inMemoryTokens.access) return inMemoryTokens.access;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
      if (token) inMemoryTokens.access = token;
      return token;
    } else if (Platform.OS !== 'web') {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (token) inMemoryTokens.access = token;
      return token;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function getRefreshToken(): Promise<string | null> {
  if (inMemoryTokens.refresh) return inMemoryTokens.refresh;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = window.localStorage.getItem(REFRESH_TOKEN_KEY);
      if (token) inMemoryTokens.refresh = token;
      return token;
    } else if (Platform.OS !== 'web') {
      const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (token) inMemoryTokens.refresh = token;
      return token;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function clearAuthTokens(): Promise<void> {
  inMemoryTokens = {};
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    } else if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });

    // Handle token expiration: attempt automatic refresh
    if (response.status === 401) {
      const refreshToken = await getRefreshToken();
      if (refreshToken && !endpoint.includes('/auth/refresh-token')) {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.success && refreshData.data) {
            await setAuthTokens(refreshData.data.accessToken, refreshData.data.refreshToken);
            headers.Authorization = `Bearer ${refreshData.data.accessToken}`;
            const retryRes = await fetch(url, { ...options, headers });
            return await retryRes.json();
          }
        }
      }
    }

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || 'Unable to connect to Infernux servers',
      },
    };
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),

  upload: async <T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const token = await getAccessToken();

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: error.message || 'Media upload failed',
        },
      };
    }
  },
};

