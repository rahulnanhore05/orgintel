import { apiClient } from './apiClient';

export const organizationService = {
  /**
   * Create a new organization tenant.
   * @param {{ name: string, slug?: string }} data
   */
  async create(data) {
    const response = await apiClient.post('/organizations', data);
    return response.data;
  },

  /**
   * List organizations belonging to authenticated user.
   */
  async list() {
    const response = await apiClient.get('/organizations');
    return response.data;
  },

  /**
   * Get specific organization details.
   */
  async get(organizationId) {
    const response = await apiClient.get(`/organizations/${organizationId}`);
    return response.data;
  },

  /**
   * List paginated members of an organization.
   */
  async listMembers(organizationId, page = 0, size = 20) {
    const response = await apiClient.get(`/organizations/${organizationId}/members`, {
      params: { page, size },
    });
    return response.data;
  },

  /**
   * Add a member to organization (requires ORG_ADMIN).
   * @param {string} organizationId
   * @param {{ userId: string, role: 'ORG_ADMIN' | 'MEMBER' }} data
   */
  async addMember(organizationId, data) {
    const response = await apiClient.post(`/organizations/${organizationId}/members`, data);
    return response.data;
  },

  /**
   * Update a member role (requires ORG_ADMIN).
   */
  async updateMemberRole(organizationId, userId, role) {
    const response = await apiClient.patch(`/organizations/${organizationId}/members/${userId}/role`, { role });
    return response.data;
  },

  /**
   * Remove a member from the organization (requires ORG_ADMIN).
   */
  async removeMember(organizationId, userId) {
    const response = await apiClient.delete(`/organizations/${organizationId}/members/${userId}`);
    return response.data;
  },
};
