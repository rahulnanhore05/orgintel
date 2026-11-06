import { apiClient } from './apiClient';

export const documentService = {
  /**
   * Upload a new document file.
   * @param {string} organizationId
   * @param {FormData} formData - Contains file, optional title, description, visibility
   * @param {Function} [onUploadProgress]
   */
  async upload(organizationId, formData, onUploadProgress) {
    const response = await apiClient.post(`/organizations/${organizationId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  },

  /**
   * Upload a replacement file creating a new version.
   * @param {string} organizationId
   * @param {string} documentId
   * @param {FormData} formData - Contains file
   */
  async uploadReplacement(organizationId, documentId, formData) {
    const response = await apiClient.post(
      `/organizations/${organizationId}/documents/${documentId}/versions`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * List authorized documents (paginated).
   */
  async list(organizationId, page = 0, size = 20) {
    const response = await apiClient.get(`/organizations/${organizationId}/documents`, {
      params: { page, size },
    });
    return response.data;
  },

  /**
   * Get document metadata, current version, and version history.
   */
  async get(organizationId, documentId) {
    const response = await apiClient.get(`/organizations/${organizationId}/documents/${documentId}`);
    return response.data;
  },

  /**
   * Download a document file stream.
   */
  async download(organizationId, documentId, versionNumber = null) {
    const response = await apiClient.get(`/organizations/${organizationId}/documents/${documentId}/download`, {
      params: versionNumber ? { version: versionNumber } : {},
      responseType: 'blob',
    });
    return response;
  },

  /**
   * Delete a document logically.
   */
  async delete(organizationId, documentId) {
    const response = await apiClient.delete(`/organizations/${organizationId}/documents/${documentId}`);
    return response.data;
  },

  /**
   * List permissions on a document.
   */
  async listPermissions(organizationId, documentId) {
    const response = await apiClient.get(`/organizations/${organizationId}/documents/${documentId}/permissions`);
    return response.data;
  },

  /**
   * Grant permission to a user.
   */
  async grantPermission(organizationId, documentId, data) {
    const response = await apiClient.post(
      `/organizations/${organizationId}/documents/${documentId}/permissions`,
      data
    );
    return response.data;
  },

  /**
   * Revoke permission from a user.
   */
  async revokePermission(organizationId, documentId, userId) {
    const response = await apiClient.delete(
      `/organizations/${organizationId}/documents/${documentId}/permissions/${userId}`
    );
    return response.data;
  },
};
