import { apiClient } from './apiClient';

export const jobService = {
  /**
   * Get ingestion job processing status and diagnostics.
   */
  async get(organizationId, jobId) {
    const response = await apiClient.get(`/organizations/${organizationId}/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Trigger retry for eligible failed job.
   */
  async retry(organizationId, jobId) {
    const response = await apiClient.post(`/organizations/${organizationId}/jobs/${jobId}/retry`);
    return response.data;
  },
};
