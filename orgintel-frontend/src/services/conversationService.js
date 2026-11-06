import { apiClient } from './apiClient';
import { useAuthStore } from '../stores/authStore';

export const conversationService = {
  /**
   * Start a new conversation thread.
   * @param {string} organizationId
   * @param {{ title?: string }} [data]
   */
  async create(organizationId, data = {}) {
    const response = await apiClient.post(`/organizations/${organizationId}/conversations`, data);
    return response.data;
  },

  /**
   * List conversations for current user in organization.
   */
  async list(organizationId, page = 0, size = 20) {
    const response = await apiClient.get(`/organizations/${organizationId}/conversations`, {
      params: { page, size },
    });
    return response.data;
  },

  /**
   * Get full conversation detail with messages and citations.
   */
  async get(organizationId, conversationId) {
    const response = await apiClient.get(`/organizations/${organizationId}/conversations/${conversationId}`);
    return response.data;
  },

  /**
   * Submit question in conversation thread. If onDelta callback is provided
   * (either as 4th parameter or in data.onDelta), streams tokens directly from backend via SSE.
   * @param {string} organizationId
   * @param {string} conversationId
   * @param {{ question: string, topK?: number, onDelta?: (text: string) => void }} data
   * @param {(text: string) => void} [onDelta]
   */
  async askQuestion(organizationId, conversationId, data, onDelta) {
    const deltaHandler = onDelta || data?.onDelta;
    const { onDelta: _, ...requestBody } = data || {};

    if (typeof deltaHandler === 'function') {
      return this.askQuestionStream(organizationId, conversationId, requestBody, deltaHandler);
    }
    const response = await apiClient.post(
      `/organizations/${organizationId}/conversations/${conversationId}/messages`,
      requestBody,
      { timeout: 120000 }
    );
    return response.data;
  },

  /**
   * Stream question response from backend via Server-Sent Events.
   * @param {string} organizationId
   * @param {string} conversationId
   * @param {{ question: string, topK?: number }} data
   * @param {(text: string) => void} onDelta
   */
  async askQuestionStream(organizationId, conversationId, data, onDelta) {
    const { accessToken } = useAuthStore.getState();
    const baseURL = apiClient.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const url = `${baseURL}/organizations/${organizationId}/conversations/${conversationId}/messages/stream`;

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    if (organizationId) {
      headers['X-Organization-Id'] = organizationId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `Request failed with status ${response.status}` };
      }
      const err = new Error(errorData.message || 'Stream request failed');
      err.response = { status: response.status, data: errorData };
      throw err;
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported on response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let completedMessage = null;
    let currentEvent = 'message';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          currentEvent = 'message';
          continue;
        }
        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.slice(6).trim();
          continue;
        }
        if (trimmed.startsWith('data:')) {
          const rawData = trimmed.slice(5).trim();
          try {
            const parsed = JSON.parse(rawData);
            if (currentEvent === 'delta') {
              if (parsed.text !== undefined && onDelta) {
                onDelta(parsed.text);
              }
            } else if (currentEvent === 'complete') {
              completedMessage = parsed;
            } else if (currentEvent === 'error') {
              throw new Error(parsed.message || 'Error received from stream');
            } else {
              if (parsed.text !== undefined && onDelta) {
                onDelta(parsed.text);
              } else if (parsed.id) {
                completedMessage = parsed;
              }
            }
          } catch (e) {
            if (currentEvent === 'error') {
              throw e;
            }
            if (currentEvent === 'delta' && rawData && onDelta) {
              onDelta(rawData);
            }
          }
        }
      }
    }

    if (buffer.trim()) {
      const line = buffer.trim();
      if (line.startsWith('data:')) {
        const rawData = line.slice(5).trim();
        try {
          const parsed = JSON.parse(rawData);
          if (currentEvent === 'complete' || parsed.id) {
            completedMessage = parsed;
          } else if (currentEvent === 'delta' && parsed.text !== undefined && onDelta) {
            onDelta(parsed.text);
          }
        } catch {
          if (currentEvent === 'delta' && rawData && onDelta) {
            onDelta(rawData);
          }
        }
      }
    }

    return completedMessage;
  },

  /**
   * Submit rating and feedback on an answer.
   * @param {string} organizationId
   * @param {string} conversationId
   * @param {string} messageId
   * @param {{ rating: number, isIncorrect?: boolean, isUnsupported?: boolean, feedbackText?: string }} data
   */
  async submitFeedback(organizationId, conversationId, messageId, data) {
    const response = await apiClient.post(
      `/organizations/${organizationId}/conversations/${conversationId}/messages/${messageId}/feedback`,
      data
    );
    return response.data;
  },

  /**
   * Delete conversation thread and its citations.
   */
  async delete(organizationId, conversationId) {
    const response = await apiClient.delete(`/organizations/${organizationId}/conversations/${conversationId}`);
    return response.data;
  },
};
