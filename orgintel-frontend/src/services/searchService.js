import { apiClient } from './apiClient';

export const searchService = {
  /**
   * Perform hybrid keyword + vector RRF search.
   * @param {string} organizationId
   * @param {{ query: string, limit?: number, documentIds?: string[] }} data
   */
  async search(organizationId, data) {
    const response = await apiClient.post(`/organizations/${organizationId}/search`, data);
    return response.data;
  },

  /**
   * Quick search using GET query parameter.
   */
  async quickSearch(organizationId, query, limit = 6) {
    const response = await apiClient.get(`/organizations/${organizationId}/search`, {
      params: { q: query, limit },
    });
    return response.data;
  },
};
