import { create } from 'zustand';
import axios from 'axios';
import type { User } from '../types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setSession: (token: string) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
  initializeAuth: () => Promise<void>;
}

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,

  setSession: (token: string) => {
    set({
      accessToken: token,
      isAuthenticated: true,
    });
  },

  setUser: (user: User) => {
    set({ user });
  },

  clearSession: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },

  initializeAuth: async () => {
    if (get().isInitialized) return;

    try {
      // 1. Try to fetch current user (checks if HTTP session cookies exist)
      const response = await axios.get<User>(`${baseURL}/users/me`, {
        withCredentials: true,
      });
      set({
        user: response.data,
        isAuthenticated: true,
      });
    } catch {
      // 2. If cookie access fails, try to silent refresh once
      try {
        const refreshResponse = await axios.post<{ access_token: string }>(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const token = refreshResponse.data.access_token;
        set({
          accessToken: token,
          isAuthenticated: true,
        });

        // 3. Retrieve user profile with new access token
        const profileResponse = await axios.get<User>(`${baseURL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        set({ user: profileResponse.data });
      } catch {
        // Both failed -> user is not authenticated
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      }
    } finally {
      set({ isInitialized: true });
    }
  },
}));
