// Zustand store

import { create } from 'zustand';
import { UserWithProfileAndAccount } from "@repo/shared-types";
import { authApi } from '@/lib/api/auth';
import Cookies from 'js-cookie';

interface AuthState {
  user: UserWithProfileAndAccount | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: UserWithProfileAndAccount | null) => void;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Decode JWT and check if it's expired
 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();

    // Consider token expired if less than 30 seconds remaining
    return expiryTime - now < 30000;
  } catch {
    return true; // Invalid token format
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false
    });
  },

  loadUser: async () => {
    const accessToken = Cookies.get('accessToken');
    const refreshToken = Cookies.get('refreshToken');

    // Check if token is expired before making request
    if (!accessToken && !refreshToken) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const user = await authApi.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      // No user logged in - this is expected on first visit
      // Don't log error, just set state
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Logout failed, but clear state anyway
      console.error('Logout error:', error);
    } finally {
      set({ user: null, isAuthenticated: false });
    }
  }
}));
