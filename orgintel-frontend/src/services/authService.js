import { apiClient } from './apiClient';

export const authService = {
  /**
   * Register a new user account.
   * @param {{ email, password, fullName }} data
   */
  async register(data) {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  /**
   * Authenticate user credentials.
   * @param {{ email, password, organizationId? }} data
   */
  async login(data) {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  /**
   * Rotate refresh token and issue new access token.
   * @param {{ refreshToken }} data
   */
  async refresh(data) {
    const response = await apiClient.post('/auth/refresh', data);
    return response.data;
  },

  /**
   * Revoke active refresh token on server.
   * @param {{ refreshToken }} data
   */
  async logout(data) {
    const response = await apiClient.post('/auth/logout', data);
    return response.data;
  },
};
