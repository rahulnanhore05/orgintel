import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { apiClient, isTokenExpiredError } from '../services/apiClient';
import { useAuthStore } from '../stores/authStore';

describe('apiClient & Token Expiration Checks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      accessToken: 'old-access-token',
      refreshToken: 'valid-refresh-token',
      isAuthenticated: true,
    });
  });

  describe('isTokenExpiredError', () => {
    it('returns true when WWW-Authenticate header specifies token_expired or invalid_token', () => {
      const error = {
        config: { url: '/documents', headers: { Authorization: 'Bearer old-token' } },
        response: {
          status: 401,
          headers: { 'www-authenticate': 'Bearer error="invalid_token", error_description="The access token expired"' },
          data: {},
        },
      };
      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('returns true when response data contains token expired error code', () => {
      const error = {
        config: { url: '/organizations/123/conversations' },
        response: {
          status: 401,
          headers: {},
          data: { errorCode: 'TOKEN_EXPIRED', message: 'Token has expired' },
        },
      };
      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('returns true when response data contains JWT_EXPIRED code', () => {
      const error = {
        config: { url: '/documents' },
        response: {
          status: 401,
          headers: {},
          data: { code: 'JWT_EXPIRED' },
        },
      };
      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('returns true when response message matches token expiration patterns', () => {
      const error = {
        config: { url: '/search' },
        response: {
          status: 401,
          headers: {},
          data: { message: 'Jwt expired at 2026-10-29T11:00:00Z' },
        },
      };
      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('returns true on 401 fallback when request had Bearer Authorization header', () => {
      const error = {
        config: { url: '/documents', headers: { Authorization: 'Bearer eyJhbGciOi...' } },
        response: {
          status: 401,
          headers: {},
          data: {},
        },
      };
      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('returns false for 401 on /auth/login (bad credentials)', () => {
      const error = {
        config: { url: '/auth/login' },
        response: {
          status: 401,
          headers: {},
          data: { errorCode: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        },
      };
      expect(isTokenExpiredError(error)).toBe(false);
    });

    it('returns false for 401 on /auth/refresh', () => {
      const error = {
        config: { url: '/auth/refresh' },
        response: {
          status: 401,
          headers: {},
          data: { errorCode: 'UNAUTHORIZED', message: 'Refresh token invalid' },
        },
      };
      expect(isTokenExpiredError(error)).toBe(false);
    });

    it('returns false for non-401/403 status codes like 404 or 500', () => {
      const error404 = {
        config: { url: '/documents/999' },
        response: { status: 404, headers: {}, data: { message: 'Document not found' } },
      };
      expect(isTokenExpiredError(error404)).toBe(false);

      const error500 = {
        config: { url: '/search' },
        response: { status: 500, headers: {}, data: { message: 'Internal Server Error' } },
      };
      expect(isTokenExpiredError(error500)).toBe(false);
    });

    it('returns false when error or error.response is missing', () => {
      expect(isTokenExpiredError(null)).toBe(false);
      expect(isTokenExpiredError({})).toBe(false);
      expect(isTokenExpiredError(new Error('Network Error'))).toBe(false);
    });
  });

  describe('Transparent token refresh within the same operation', () => {
    it('calls refresh API on expired token response and resolves original operation', async () => {
      const mockPost = vi.spyOn(axios, 'post').mockResolvedValue({
        data: {
          accessToken: 'new-access-token-123',
          refreshToken: 'new-refresh-token-456',
        },
      });

      // Provide custom adapter for retrying without actual network call
      const originalAdapter = apiClient.defaults.adapter;
      apiClient.defaults.adapter = async (config) => ({
        data: { documents: ['doc1', 'doc2'] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });

      try {
        // Simulate a request to /documents that fails with token expired
        const expiredError = {
          config: {
            url: '/documents',
            headers: { Authorization: 'Bearer old-access-token' },
          },
          response: {
            status: 401,
            headers: {},
            data: { errorCode: 'TOKEN_EXPIRED', message: 'Access token expired' },
          },
        };

        // Invoke interceptor rejected handler directly
        const errorHandler = apiClient.interceptors.response.handlers[0].rejected;
        const result = await errorHandler(expiredError);

        // 1. Verifies refresh API was called within the same operation
        expect(mockPost).toHaveBeenCalledWith(
          expect.stringContaining('/auth/refresh'),
          { refreshToken: 'valid-refresh-token' }
        );

        // 2. Verifies new tokens were updated in the store
        const state = useAuthStore.getState();
        expect(state.accessToken).toBe('new-access-token-123');
        expect(state.refreshToken).toBe('new-refresh-token-456');

        // 3. Verifies original request was retried with new token and returned to caller
        expect(result.data).toEqual({ documents: ['doc1', 'doc2'] });
        expect(result.config.headers.Authorization).toBe('Bearer new-access-token-123');
      } finally {
        apiClient.defaults.adapter = originalAdapter;
      }
    });

    it('clears session and rejects if refresh token is missing', async () => {
      useAuthStore.setState({
        accessToken: 'expired-token',
        refreshToken: null,
      });

      const expiredError = {
        config: {
          url: '/documents',
          headers: { Authorization: 'Bearer expired-token' },
        },
        response: {
          status: 401,
          headers: {},
          data: { errorCode: 'TOKEN_EXPIRED' },
        },
      };

      const errorHandler = apiClient.interceptors.response.handlers[0].rejected;
      await expect(errorHandler(expiredError)).rejects.toEqual(expiredError);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
    });

    it('clears session and rejects if refresh API call fails', async () => {
      vi.spyOn(axios, 'post').mockRejectedValue(new Error('Refresh token revoked'));

      const expiredError = {
        config: {
          url: '/documents',
          headers: { Authorization: 'Bearer expired-token' },
        },
        response: {
          status: 401,
          headers: {},
          data: { errorCode: 'TOKEN_EXPIRED' },
        },
      };

      const errorHandler = apiClient.interceptors.response.handlers[0].rejected;
      await expect(errorHandler(expiredError)).rejects.toThrow('Refresh token revoked');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
