import { create } from 'zustand';

const TOKEN_KEY = 'orgintel_access_token';
const REFRESH_KEY = 'orgintel_refresh_token';
const USER_KEY = 'orgintel_user';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(sessionStorage.getItem(USER_KEY) || 'null'),
  accessToken: sessionStorage.getItem(TOKEN_KEY) || null,
  refreshToken: sessionStorage.getItem(REFRESH_KEY) || null,
  isAuthenticated: !!sessionStorage.getItem(TOKEN_KEY),
  isInitialized: false,

  setSession: (authResponse) => {
    if (!authResponse) return;
    const { accessToken, refreshToken, user } = authResponse;

    if (accessToken) {
      sessionStorage.setItem(TOKEN_KEY, accessToken);
    }
    if (refreshToken) {
      sessionStorage.setItem(REFRESH_KEY, refreshToken);
    }
    if (user) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    set({
      user: user || get().user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isInitialized: true,
    });
  },

  updateTokens: (accessToken, refreshToken) => {
    if (accessToken) {
      sessionStorage.setItem(TOKEN_KEY, accessToken);
    }
    if (refreshToken) {
      sessionStorage.setItem(REFRESH_KEY, refreshToken);
    }
    set({
      accessToken,
      refreshToken: refreshToken || get().refreshToken,
      isAuthenticated: true,
    });
  },

  clearSession: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_KEY);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitialized: true,
    });
  },

  setInitialized: () => set({ isInitialized: true }),
}));
