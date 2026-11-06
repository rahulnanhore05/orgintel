import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { useOrgStore } from '../stores/orgStore';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT and Tenant context
apiClient.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      if (config.headers?.set) {
        config.headers.set('Authorization', `Bearer ${accessToken}`);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    const { activeOrg } = useOrgStore.getState();
    if (activeOrg?.id) {
      if (config.headers?.set) {
        config.headers.set('X-Organization-Id', activeOrg.id);
      } else {
        config.headers = config.headers || {};
        config.headers['X-Organization-Id'] = activeOrg.id;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Checks whether an API error response indicates an expired or invalid access token.
 * Validates HTTP status, RFC 6750 headers (WWW-Authenticate), backend error codes,
 * and error messages.
 *
 * @param {import('axios').AxiosError} error
 * @returns {boolean}
 */
export function isTokenExpiredError(error) {
  if (!error || !error.response) return false;

  const { status, headers, data } = error.response;
  const config = error.config || {};
  const url = config.url || '';

  // Exclude authentication endpoints where 401 represents invalid credentials
  if (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh')
  ) {
    return false;
  }

  // Explicit non-token errors (such as bad credentials)
  const errorCode = (data?.errorCode || data?.code || data?.error || '').toString().toUpperCase();
  if (
    errorCode === 'INVALID_CREDENTIALS' ||
    errorCode === 'BAD_CREDENTIALS' ||
    errorCode === 'ACCOUNT_LOCKED'
  ) {
    return false;
  }

  // Must be an authentication-related status
  if (status !== 401 && status !== 403) {
    return false;
  }

  // 1. Check RFC 6750 WWW-Authenticate header
  const wwwAuth = (
    headers?.['www-authenticate'] ||
    headers?.['WWW-Authenticate'] ||
    (typeof headers?.get === 'function' ? headers.get('www-authenticate') : '') ||
    ''
  ).toString().toLowerCase();

  if (
    wwwAuth.includes('token_expired') ||
    wwwAuth.includes('invalid_token') ||
    wwwAuth.includes('expired')
  ) {
    return true;
  }

  // 2. Check structured error codes from backend
  const tokenExpiredCodes = [
    'TOKEN_EXPIRED',
    'EXPIRED_TOKEN',
    'ACCESS_TOKEN_EXPIRED',
    'JWT_EXPIRED',
    'EXPIRED_JWT',
    'TOKEN_INVALID',
    'INVALID_TOKEN',
    'UNAUTHORIZED',
  ];
  if (tokenExpiredCodes.includes(errorCode)) {
    return true;
  }

  // 3. Check error message text
  const message = (
    data?.message ||
    data?.error ||
    data?.error_description ||
    data?.detail ||
    ''
  ).toString().toLowerCase();

  const tokenExpiredPatterns = [
    /token.*expired/i,
    /jwt.*expired/i,
    /expired.*token/i,
    /expired.*jwt/i,
    /token.*not.*valid/i,
    /invalid.*token/i,
    /token.*invalid/i,
    /token.*has.*expired/i,
    /jwt.*signature/i,
  ];

  if (tokenExpiredPatterns.some((pattern) => pattern.test(message))) {
    return true;
  }

  // 4. Fallback: If a protected request was sent with an Authorization Bearer header
  // and received a 401, it is an access token expiration/unauthorized response
  const authHeader = config.headers?.Authorization || config.headers?.authorization;
  if (status === 401 && authHeader && String(authHeader).startsWith('Bearer ')) {
    return true;
  }

  return false;
}

// Token Refresh Coordination
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Token Expiration Check & Transparent Refresh within Same Operation
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if response indicates access token expiration and has not already been retried
    if (originalRequest && !originalRequest._retry && isTokenExpiredError(error)) {
      if (isRefreshing) {
        // Queue concurrent requests to wait for in-progress refresh
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers?.set) {
              originalRequest.headers.set('Authorization', `Bearer ${token}`);
            } else {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, updateTokens, clearSession } = useAuthStore.getState();

      if (!refreshToken) {
        clearSession();
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        // Call refresh API within the same operation
        const refreshResponse = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data;
        updateTokens(newAccessToken, newRefreshToken);

        if (originalRequest.headers?.set) {
          originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
        } else {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        // Retry the original request and return the result to the caller within the same operation
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
