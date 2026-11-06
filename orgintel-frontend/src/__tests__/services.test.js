import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../services/apiClient';
import { authService } from '../services/authService';
import { organizationService } from '../services/organizationService';
import { documentService } from '../services/documentService';
import { searchService } from '../services/searchService';
import { conversationService } from '../services/conversationService';

describe('API Services', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('authService', () => {
    it('sends correct POST /auth/login request', async () => {
      const mockResponse = { data: { accessToken: 'token123' } };
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockResponse);

      const result = await authService.login({ email: 'test@example.com', password: 'Password123!' });
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'Password123!',
      });
      expect(result.accessToken).toBe('token123');
    });

    it('sends correct POST /auth/register request', async () => {
      const mockResponse = { data: { user: { id: 'u1' } } };
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockResponse);

      const payload = { email: 'new@example.com', password: 'Password123!', fullName: 'New User' };
      const result = await authService.register(payload);
      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', payload);
      expect(result.user.id).toBe('u1');
    });
  });

  describe('organizationService', () => {
    it('sends GET /organizations to list user orgs', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [{ id: 'o1', name: 'Acme' }] });
      const result = await organizationService.list();
      expect(apiClient.get).toHaveBeenCalledWith('/organizations');
      expect(result.length).toBe(1);
    });

    it('sends POST /organizations to create new organization', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 'o2', name: 'Legal Corp' } });
      const result = await organizationService.create({ name: 'Legal Corp', slug: 'legal' });
      expect(apiClient.post).toHaveBeenCalledWith('/organizations', { name: 'Legal Corp', slug: 'legal' });
      expect(result.id).toBe('o2');
    });

    it('sends POST /organizations/{id}/members to add member by email', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 'm1', email: 'colleague@company.com' } });
      const result = await organizationService.addMember('org-123', {
        email: 'colleague@company.com',
        role: 'MEMBER',
      });
      expect(apiClient.post).toHaveBeenCalledWith('/organizations/org-123/members', {
        email: 'colleague@company.com',
        role: 'MEMBER',
      });
      expect(result.email).toBe('colleague@company.com');
    });
  });

  describe('documentService', () => {
    it('sends GET /organizations/{id}/documents with pagination params', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { content: [], totalElements: 0 } });
      await documentService.list('org-123', 1, 10);
      expect(apiClient.get).toHaveBeenCalledWith('/organizations/org-123/documents', {
        params: { page: 1, size: 10 },
      });
    });

    it('sends DELETE /organizations/{id}/documents/{docId}', async () => {
      vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: {} });
      await documentService.delete('org-123', 'doc-456');
      expect(apiClient.delete).toHaveBeenCalledWith('/organizations/org-123/documents/doc-456');
    });
  });

  describe('searchService', () => {
    it('sends POST /organizations/{id}/search with query and limit', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { query: 'tax', results: [] } });
      await searchService.search('org-123', { query: 'tax', limit: 6 });
      expect(apiClient.post).toHaveBeenCalledWith('/organizations/org-123/search', {
        query: 'tax',
        limit: 6,
      });
    });
  });

  describe('conversationService', () => {
    it('sends POST /organizations/{id}/conversations/{cId}/messages', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 'm1', content: 'Answer' } });
      await conversationService.askQuestion('org-123', 'conv-456', { question: 'What is EBITDA?', topK: 6 });
      expect(apiClient.post).toHaveBeenCalledWith(
        '/organizations/org-123/conversations/conv-456/messages',
        {
          question: 'What is EBITDA?',
          topK: 6,
        },
        { timeout: 120000 }
      );
    });

    it('streams tokens from backend SSE when onDelta is provided', async () => {
      const sseText =
        'event: delta\ndata: {"text":"Hello "}\n\n' +
        'event: delta\ndata: {"text":"World"}\n\n' +
        'event: complete\ndata: {"id":"msg-stream-1","content":"Hello World","citations":[]}\n\n';

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(sseText));
          controller.close();
        },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: mockStream,
      });
      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const deltas = [];
        const res = await conversationService.askQuestion(
          'org-123',
          'conv-456',
          { question: 'Stream query' },
          (token) => deltas.push(token)
        );

        expect(deltas).toEqual(['Hello ', 'World']);
        expect(res.id).toBe('msg-stream-1');
        expect(res.content).toBe('Hello World');
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/organizations/org-123/conversations/conv-456/messages/stream'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              Accept: 'text/event-stream',
            }),
          })
        );
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('sends POST /organizations/{id}/conversations/{cId}/messages/{mId}/feedback', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
      await conversationService.submitFeedback('org-123', 'conv-456', 'm1', { rating: 5, feedbackText: 'Accurate' });
      expect(apiClient.post).toHaveBeenCalledWith('/organizations/org-123/conversations/conv-456/messages/m1/feedback', {
        rating: 5,
        feedbackText: 'Accurate',
      });
    });
  });
});
