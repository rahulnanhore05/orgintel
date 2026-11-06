import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChatPage } from '../pages/chat/ChatPage';
import { conversationService } from '../services/conversationService';
import { useOrgStore } from '../stores/orgStore';
import { useNotificationStore } from '../stores/notificationStore';

vi.mock('../services/conversationService');

describe('ChatPage Question Asking & 404 Resilience', () => {
  const mockOrg = { id: 'org-abc-123', name: 'Acme Corp', role: 'ORG_ADMIN' };

  beforeEach(() => {
    vi.clearAllMocks();
    useOrgStore.setState({ activeOrg: mockOrg, userOrgs: [mockOrg] });
    useNotificationStore.setState({ notifications: [] });

    conversationService.list.mockResolvedValue({ content: [], totalElements: 0 });
  });

  it('creates a new conversation and submits question when starting from /chat', async () => {
    const mockNewConv = {
      id: 'conv-new-1',
      title: 'What is our revenue?',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockAssistantResponse = {
      id: 'msg-assist-1',
      role: 'ASSISTANT',
      content: 'Our revenue was $12M in Q3 according to financial statements.',
      sequenceNumber: 2,
      citations: [
        {
          citationOrder: 1,
          sourceLocation: 'Financial Report 2026, p. 4',
          snippet: 'Total revenue achieved $12M',
        },
      ],
      createdAt: new Date().toISOString(),
    };

    conversationService.create.mockResolvedValue(mockNewConv);
    conversationService.askQuestion.mockResolvedValue(mockAssistantResponse);

    render(
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Ask an evidence-based question/i);
    const submitBtn = screen.getByRole('button', { name: /Ask/i });

    fireEvent.change(input, { target: { value: 'What is our revenue?' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(conversationService.create).toHaveBeenCalledWith(
        'org-abc-123',
        expect.objectContaining({ title: 'What is our revenue?' })
      );
      expect(conversationService.askQuestion).toHaveBeenCalledWith(
        'org-abc-123',
        'conv-new-1',
        expect.objectContaining({ question: 'What is our revenue?', topK: 6 })
      );
    });

    // Verify optimistic user message and assistant message appear
    expect(await screen.findByText('What is our revenue?')).toBeDefined();
    expect(await screen.findByText(/Our revenue was \$12M/i)).toBeDefined();
  });

  it('reuses the active conversation ID for consecutive questions instead of creating a new conversation each time', async () => {
    const mockNewConv = {
      id: 'conv-persistent-1',
      title: 'First Question',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockAssistant1 = {
      id: 'msg-1',
      role: 'ASSISTANT',
      content: 'Answer 1',
      sequenceNumber: 2,
      citations: [],
      createdAt: new Date().toISOString(),
    };
    const mockAssistant2 = {
      id: 'msg-2',
      role: 'ASSISTANT',
      content: 'Answer 2',
      sequenceNumber: 4,
      citations: [],
      createdAt: new Date().toISOString(),
    };

    conversationService.create.mockResolvedValue(mockNewConv);
    conversationService.askQuestion
      .mockResolvedValueOnce(mockAssistant1)
      .mockResolvedValueOnce(mockAssistant2);

    render(
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Ask an evidence-based question/i);
    const submitBtn = screen.getByRole('button', { name: /Ask/i });

    // Question 1
    fireEvent.change(input, { target: { value: 'First Question' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Answer 1')).toBeDefined();
    expect(conversationService.create).toHaveBeenCalledTimes(1);

    // Question 2 in the same thread
    fireEvent.change(input, { target: { value: 'Second Question' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(conversationService.askQuestion).toHaveBeenCalledWith(
        'org-abc-123',
        'conv-persistent-1',
        expect.objectContaining({ question: 'Second Question' })
      );
    });

    // Crucial: conversationService.create should still have only been called once!
    expect(conversationService.create).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Answer 2')).toBeDefined();
  });

  it('automatically recovers when askQuestion encounters a 404 by creating a fresh conversation in active org and retrying', async () => {
    const notFoundError = new Error('Conversation not found');
    notFoundError.response = {
      status: 404,
      data: { message: 'Conversation not found: stale-conv-id' },
    };

    const mockFreshConv = {
      id: 'conv-recovered-99',
      title: 'What are the clauses?',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockAssistantRecovered = {
      id: 'msg-rec-1',
      role: 'ASSISTANT',
      content: 'Here are the recovered clauses.',
      sequenceNumber: 2,
      citations: [],
      createdAt: new Date().toISOString(),
    };

    // First attempt on stale conversation returns 404
    conversationService.get.mockResolvedValue({
      id: 'stale-conv-id',
      title: 'Stale Thread',
      messages: [],
    });
    conversationService.askQuestion
      .mockRejectedValueOnce(notFoundError)
      .mockResolvedValueOnce(mockAssistantRecovered);
    conversationService.create.mockResolvedValue(mockFreshConv);

    render(
      <MemoryRouter initialEntries={['/chat/stale-conv-id']}>
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>
    );

    const input = await screen.findByPlaceholderText(/Ask an evidence-based question/i);
    const submitBtn = screen.getByRole('button', { name: /Ask/i });

    fireEvent.change(input, { target: { value: 'What are the clauses?' } });
    fireEvent.click(submitBtn);

    // Should create a fresh conversation and retry question successfully
    await waitFor(() => {
      expect(conversationService.create).toHaveBeenCalledWith(
        'org-abc-123',
        expect.objectContaining({ title: 'What are the clauses?' })
      );
      expect(conversationService.askQuestion).toHaveBeenCalledWith(
        'org-abc-123',
        'conv-recovered-99',
        expect.objectContaining({ question: 'What are the clauses?' })
      );
    });

    expect(await screen.findByText('Here are the recovered clauses.')).toBeDefined();
  });

  it('resets conversation state when active organization changes to prevent cross-workspace 404 errors', async () => {
    const mockOrgA = { id: 'org-aaa', name: 'Org Alpha', role: 'MEMBER' };
    const mockOrgB = { id: 'org-bbb', name: 'Org Beta', role: 'MEMBER' };

    useOrgStore.setState({ activeOrg: mockOrgA, userOrgs: [mockOrgA, mockOrgB] });

    conversationService.get.mockResolvedValue({
      id: 'conv-in-org-a',
      title: 'Alpha Thread',
      messages: [
        { id: 'm1', role: 'USER', content: 'Alpha question' },
        { id: 'm2', role: 'ASSISTANT', content: 'Alpha answer', citations: [] },
      ],
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={['/chat/conv-in-org-a']}>
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Initial load in Org Alpha
    expect(await screen.findByText('Alpha question')).toBeDefined();
    expect(await screen.findByText('Alpha answer')).toBeDefined();

    // User switches to Org Beta
    act(() => {
      useOrgStore.setState({ activeOrg: mockOrgB });
    });

    rerender(
      <MemoryRouter initialEntries={['/chat/conv-in-org-a']}>
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Old conversation messages should be cleared
    await waitFor(() => {
      expect(screen.queryByText('Alpha question')).toBeNull();
      expect(screen.queryByText('Alpha answer')).toBeNull();
    });
  });

  it('only displays Rate Answer option once the complete answer is displayed and not while streaming', async () => {
    let resolveAskQuestion;
    const askQuestionPromise = new Promise((resolve) => {
      resolveAskQuestion = resolve;
    });

    conversationService.get.mockResolvedValue({
      id: 'conv-rate-test',
      title: 'Rate Question',
      messages: [],
    });

    // When askQuestion is called, invoke onDelta once to simulate partial streaming, but do not resolve immediately
    conversationService.askQuestion.mockImplementation(({ onDelta }) => {
      if (onDelta) {
        onDelta('Partial text...');
      }
      return askQuestionPromise;
    });

    render(
      <MemoryRouter initialEntries={['/chat/conv-rate-test']}>
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>
    );

    const input = await screen.findByPlaceholderText(/Ask an evidence-based question/i);
    const submitBtn = screen.getByRole('button', { name: /Ask/i });

    fireEvent.change(input, { target: { value: 'Explain quantum computing' } });
    fireEvent.click(submitBtn);

    // During streaming / pending state:
    // Rate Answer MUST NOT be visible!
    expect(screen.queryByRole('button', { name: /Rate Answer/i })).toBeNull();

    // Now resolve askQuestion with complete answer
    await act(async () => {
      resolveAskQuestion({
        id: 'msg-final-123',
        role: 'ASSISTANT',
        content: 'Quantum computing leverages qubits for superposition and entanglement.',
        citations: [],
        createdAt: new Date().toISOString(),
      });
    });

    // Once complete answer is displayed:
    // Rate Answer MUST appear!
    expect(await screen.findByRole('button', { name: /Rate Answer/i })).toBeDefined();
    expect(screen.getByText(/Quantum computing leverages qubits/i)).toBeDefined();
  });
});
