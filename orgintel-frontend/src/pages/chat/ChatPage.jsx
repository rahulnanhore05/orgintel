import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrganization } from '../../hooks/useOrganization';
import { conversationService } from '../../services/conversationService';
import { useNotificationStore } from '../../stores/notificationStore';
import { useUiStore } from '../../stores/uiStore';
import { parseApiError } from '../../utils/errorUtils';
import { formatDateTime } from '../../utils/formatters';
import { StreamingMessageContent } from '../../components/chat/StreamingMessageContent';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Star,
  Bot,
  User,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export function ChatPage() {
  const { conversationId } = useParams();
  const { activeOrg } = useOrganization();
  const { addNotification } = useNotificationStore();
  const { openCitation } = useUiStore();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Question submission
  const [questionText, setQuestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const messagesEndRef = useRef(null);

  // Feedback state
  const [feedbackMap, setFeedbackMap] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [isIncorrect, setIsIncorrect] = useState(false);
  const [isUnsupported, setIsUnsupported] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Fetch conversations list for sidebar
  const fetchConversations = useCallback(async () => {
    if (!activeOrg?.id) return [];
    try {
      const data = await conversationService.list(activeOrg.id, 0, 50);
      const list = data.content || [];
      setConversations(list);
      return list;
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Error loading conversations',
        message: parsed.message,
      });
      return [];
    } finally {
      setIsLoadingList(false);
    }
  }, [activeOrg, addNotification]);

  // Load active conversation messages from server
  const loadConversation = useCallback(async (cId) => {
    if (!activeOrg?.id || !cId) return;
    setIsLoadingThread(true);
    setStreamingMessageId(null);
    try {
      const detail = await conversationService.get(activeOrg.id, cId);
      setActiveConversation(detail);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Could not load conversation',
        message: parsed.message,
      });
      navigate('/chat');
    } finally {
      setIsLoadingThread(false);
    }
  }, [activeOrg?.id, addNotification, navigate]);

  // Track activeOrg changes to reset thread state and avoid cross-org conversation leaks
  const prevOrgIdRef = useRef(activeOrg?.id);
  const skipLoadConvIdRef = useRef(null);

  useEffect(() => {
    if (prevOrgIdRef.current && prevOrgIdRef.current !== activeOrg?.id) {
      setActiveConversation(null);
      setConversations([]);
      if (conversationId) {
        navigate('/chat', { replace: true });
      }
    }
    prevOrgIdRef.current = activeOrg?.id;
  }, [activeOrg?.id, conversationId, navigate]);

  // Initial load of conversations list on org change
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load thread detail when route conversationId changes
  useEffect(() => {
    if (conversationId) {
      if (skipLoadConvIdRef.current === conversationId) {
        skipLoadConvIdRef.current = null;
        return;
      }
      loadConversation(conversationId);
    } else {
      setActiveConversation(null);
    }
  }, [conversationId, loadConversation]);

  // Start new conversation: navigates to fresh /chat screen
  const handleNewConversation = () => {
    setActiveConversation(null);
    setStreamingMessageId(null);
    setQuestionText('');
    navigate('/chat');
  };

  // Submit question
  const handleAskQuestion = async (e) => {
    e?.preventDefault();
    const query = questionText.trim();
    if (!query || isSubmitting || !activeOrg?.id) return;

    let targetConvId = conversationId || activeConversation?.id;

    setIsSubmitting(true);
    setQuestionText('');

    // If no conversation exists yet, create it synchronously first
    if (!targetConvId) {
      try {
        const titleSnippet = query.length > 50 ? query.substring(0, 47) + '...' : query;
        const newConv = await conversationService.create(activeOrg.id, { title: titleSnippet });
        targetConvId = newConv.id;
        skipLoadConvIdRef.current = newConv.id;
        setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
        navigate(`/chat/${newConv.id}`, { replace: true });
      } catch (err) {
        setIsSubmitting(false);
        const parsed = parseApiError(err);
        addNotification({ type: 'error', title: 'Failed to initiate conversation', message: parsed.message });
        return;
      }
    }

    // Add optimistic user message and streaming assistant placeholder to view
    const optimisticUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: query,
      sequenceNumber: (activeConversation?.messages?.length || 0) + 1,
      citations: [],
      createdAt: new Date().toISOString(),
    };

    const assistantPlaceholderId = `stream-${Date.now()}`;
    const optimisticAssistantMsg = {
      id: assistantPlaceholderId,
      role: 'ASSISTANT',
      content: '',
      sequenceNumber: (activeConversation?.messages?.length || 0) + 2,
      citations: [],
      createdAt: new Date().toISOString(),
    };

    setActiveConversation((prev) => ({
      id: targetConvId,
      title: prev?.title || query.slice(0, 50),
      createdAt: prev?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [...(prev?.messages || []), optimisticUserMsg, optimisticAssistantMsg],
    }));
    setStreamingMessageId(assistantPlaceholderId);

    setTimeout(scrollToBottom, 50);

    let streamedContent = '';
    const handleDelta = (chunkText) => {
      streamedContent += chunkText;
      setActiveConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === assistantPlaceholderId
              ? { ...m, content: m.content + chunkText }
              : m
          ),
        };
      });
      scrollToBottom();
    };

    try {
      const assistantResponse = await conversationService.askQuestion(
        activeOrg.id,
        targetConvId,
        { question: query, topK: 6, onDelta: handleDelta }
      );

      // Finalize assistant message with server-provided metadata and citations
      const finalContent = assistantResponse?.content || streamedContent;
      setActiveConversation((prev) => {
        if (!prev) return prev;
        const finalizedMsg = {
          ...(assistantResponse || {}),
          id: assistantResponse?.id || assistantPlaceholderId,
          role: 'ASSISTANT',
          content: finalContent,
          citations: assistantResponse?.citations || [],
        };
        const hasPlaceholder = prev.messages.some((m) => m.id === assistantPlaceholderId);
        const updatedMessages = hasPlaceholder
          ? prev.messages.map((m) => (m.id === assistantPlaceholderId ? finalizedMsg : m))
          : [...prev.messages, finalizedMsg];

        return {
          ...prev,
          id: targetConvId,
          messages: updatedMessages,
        };
      });
      setStreamingMessageId(null);

      // Refresh sidebar thread list
      fetchConversations();
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      // If 404 (Conversation not found), automatically recover by creating a fresh conversation in the active org
      if (err?.response?.status === 404) {
        try {
          const titleSnippet = query.length > 50 ? query.substring(0, 47) + '...' : query;
          const freshConv = await conversationService.create(activeOrg.id, { title: titleSnippet });
          targetConvId = freshConv.id;
          skipLoadConvIdRef.current = freshConv.id;
          navigate(`/chat/${freshConv.id}`, { replace: true });

          let retryStreamedContent = '';
          const handleRetryDelta = (chunkText) => {
            retryStreamedContent += chunkText;
            setActiveConversation((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === assistantPlaceholderId
                    ? { ...m, content: m.content + chunkText }
                    : m
                ),
              };
            });
            scrollToBottom();
          };

          const retryResponse = await conversationService.askQuestion(
            activeOrg.id,
            targetConvId,
            { question: query, topK: 6, onDelta: handleRetryDelta }
          );

          const finalRetryContent = retryResponse?.content || retryStreamedContent;
          const finalRetryMsg = {
            ...(retryResponse || {}),
            id: retryResponse?.id || assistantPlaceholderId,
            role: 'ASSISTANT',
            content: finalRetryContent,
            citations: retryResponse?.citations || [],
          };

          setActiveConversation({
            id: targetConvId,
            title: freshConv.title,
            createdAt: freshConv.createdAt,
            updatedAt: freshConv.updatedAt,
            messages: [optimisticUserMsg, finalRetryMsg],
          });
          setStreamingMessageId(null);

          fetchConversations();
          setTimeout(scrollToBottom, 100);
          return;
        } catch (retryErr) {
          const parsedRetry = parseApiError(retryErr);
          addNotification({
            type: 'error',
            title: 'Question Failed',
            message: parsedRetry.message,
          });
          // Clean up empty assistant placeholder on retry error
          setActiveConversation((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.filter((m) => m.id !== assistantPlaceholderId || m.content.length > 0),
            };
          });
          setStreamingMessageId(null);
          return;
        }
      }

      // Clean up empty assistant placeholder on error
      setActiveConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.filter((m) => m.id !== assistantPlaceholderId || m.content.length > 0),
        };
      });
      setStreamingMessageId(null);

      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Question Failed',
        message: parsed.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete thread
  const handleDeleteConversation = async (e, cId) => {
    e.stopPropagation();
    if (!activeOrg?.id) return;
    try {
      await conversationService.delete(activeOrg.id, cId);
      addNotification({
        type: 'info',
        title: 'Conversation Deleted',
        message: 'Thread and message citations deleted.',
      });
      const remaining = conversations.filter((c) => c.id !== cId);
      setConversations(remaining);
      if (cId === conversationId || cId === activeConversation?.id) {
        if (remaining.length > 0) {
          navigate(`/chat/${remaining[0].id}`);
        } else {
          setActiveConversation(null);
          navigate('/chat');
        }
      }
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: parsed.message,
      });
    }
  };

  // Submit answer feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    const currentConvId = conversationId || activeConversation?.id;
    if (!activeOrg?.id || !currentConvId || !feedbackMessage) return;

    setIsSubmittingFeedback(true);
    try {
      await conversationService.submitFeedback(activeOrg.id, currentConvId, feedbackMessage.id, {
        rating: feedbackRating,
        isIncorrect,
        isUnsupported,
        feedbackText: feedbackText.trim() || undefined,
      });

      addNotification({
        type: 'success',
        title: 'Feedback Recorded',
        message: 'Thank you for evaluating this grounded response.',
      });

      setFeedbackMap((prev) => ({
        ...prev,
        [feedbackMessage.id]: feedbackRating,
      }));

      setFeedbackMessage(null);
      setFeedbackText('');
      setIsIncorrect(false);
      setIsUnsupported(false);
    } catch (err) {
      const parsed = parseApiError(err);
      addNotification({
        type: 'error',
        title: 'Feedback Failed',
        message: parsed.message,
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - var(--header-height))', overflow: 'hidden' }}>
      {/* Left Pane: Conversation Threads Sidebar */}
      <div
        style={{
          width: 280,
          borderRight: '1px solid var(--border-light)',
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-light)' }}>
          <Button
            variant="primary"
            style={{ width: '100%' }}
            icon={Plus}
            onClick={handleNewConversation}
          >
            New Conversation
          </Button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-2)' }}>
          {isLoadingList ? (
            <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <Skeleton height="2.2rem" />
              <Skeleton height="2.2rem" />
              <Skeleton height="2.2rem" />
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              No conversation history in this workspace yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {conversations.map((c) => {
                const isActive = c.id === (conversationId || activeConversation?.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/chat/${c.id}`)}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      backgroundColor: isActive ? 'var(--primary-50)' : 'transparent',
                      color: isActive ? 'var(--primary-800)' : 'var(--text-secondary)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: isActive ? 600 : 500,
                      gap: 'var(--space-2)',
                    }}
                  >
                    <MessageSquare size={15} style={{ flexShrink: 0, color: isActive ? 'var(--primary-800)' : 'var(--text-muted)' }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.title || 'Untitled Thread'}
                    </span>
                    <button
                      onClick={(e) => handleDeleteConversation(e, c.id)}
                      className="btn-ghost"
                      style={{ padding: '2px', color: 'var(--text-muted)', opacity: isActive ? 1 : 0.4 }}
                      title="Delete conversation"
                      aria-label="Delete conversation"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Message Feed & Input Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-app)' }}>
        {/* Messages Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6) var(--space-8)' }}>
          {isLoadingThread ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 840, margin: '0 auto' }}>
              <Skeleton height="4rem" />
              <Skeleton height="6rem" />
              <Skeleton height="4rem" />
            </div>
          ) : !activeConversation || activeConversation.messages?.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', maxWidth: 480 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--primary-50)',
                    color: 'var(--primary-800)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto var(--space-4) auto',
                  }}
                >
                  <Sparkles size={26} />
                </div>
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                  Grounded Enterprise Question Answering
                </h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Ask questions across all organizational documents. Answers cite exact document excerpts with verified prompt isolation boundaries and abstain when evidence is insufficient.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {activeConversation.messages.map((msg) => {
                const isUser = msg.role === 'USER';
                const currentRating = feedbackMap[msg.id] ?? msg.feedbackRating;
                const isAnswerComplete =
                  !isUser &&
                  streamingMessageId !== msg.id &&
                  !String(msg.id).startsWith('stream-') &&
                  !String(msg.id).startsWith('temp-') &&
                  Boolean(msg.content && msg.content.trim().length > 0);

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {/* Role header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-1)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {isUser ? (
                        <>
                          <span>You</span>
                          <User size={13} />
                        </>
                      ) : (
                        <>
                          <Bot size={13} style={{ color: 'var(--primary-700)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--primary-800)' }}>OrgIntel</span>
                          <span>&bull;</span>
                          <span>{formatDateTime(msg.createdAt)}</span>
                        </>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      style={{
                        padding: 'var(--space-4) var(--space-5)',
                        borderRadius: 'var(--radius-md)',
                        maxWidth: '90%',
                        fontSize: 'var(--text-sm)',
                        lineHeight: 1.65,
                        backgroundColor: isUser ? 'var(--primary-800)' : 'var(--bg-surface)',
                        color: isUser ? 'var(--text-inverse)' : 'var(--text-primary)',
                        border: isUser ? 'none' : '1px solid var(--border-light)',
                        boxShadow: 'var(--shadow-xs)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {isUser ? (
                        msg.content
                      ) : (
                        <StreamingMessageContent
                          content={msg.content}
                          citations={msg.citations}
                          isStreaming={streamingMessageId === msg.id}
                        />
                      )}
                    </div>

                    {/* Citations and Rating Bar for Assistant Messages (only displayed once answer is completely visible) */}
                    {isAnswerComplete && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          marginTop: 'var(--space-2)',
                          flexWrap: 'wrap',
                        }}
                      >
                        {msg.citations && msg.citations.length > 0 && (
                          <>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
                              Sources:
                            </span>
                            {msg.citations.map((c) => (
                              <button
                                key={c.citationOrder}
                                onClick={() => openCitation(c)}
                                style={{
                                  fontSize: 'var(--text-xs)',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-xs)',
                                  backgroundColor: 'var(--bg-surface-muted)',
                                  border: '1px solid var(--border-light)',
                                  color: 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer',
                                }}
                                title="Click to view verified excerpt"
                              >
                                <span style={{ fontWeight: 700, color: 'var(--primary-800)' }}>[{c.citationOrder}]</span>
                                <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {c.sourceLocation || 'Passage Source'}
                                </span>
                                <ExternalLink size={10} style={{ opacity: 0.5 }} />
                              </button>
                            ))}
                          </>
                        )}

                        {/* Rating or Feedback Button */}
                        {currentRating != null ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: 'var(--text-xs)',
                              color: '#b45309',
                              backgroundColor: '#fefce8',
                              border: '1px solid #fef08a',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-xs)',
                              fontWeight: 600,
                              marginLeft: 'var(--space-1)',
                            }}
                          >
                            <Star size={11} fill="#b45309" />
                            <span>Rated {currentRating}/5</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setFeedbackMessage(msg);
                              setFeedbackRating(5);
                              setIsIncorrect(false);
                              setIsUnsupported(false);
                              setFeedbackText('');
                            }}
                            className="btn-ghost"
                            style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--text-muted)',
                              marginLeft: 'var(--space-1)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 6px',
                            }}
                          >
                            <Star size={13} />
                            <span>Rate Answer</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {isSubmitting && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', padding: 'var(--space-2) 0' }}>
                  <Bot size={16} className="spinner" />
                  <span>Retrieving passages, validating grounding boundaries, and generating answer...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Question Input Footer */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-8)',
            borderTop: '1px solid var(--border-light)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <form onSubmit={handleAskQuestion} style={{ maxWidth: 840, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                type="text"
                placeholder="Ask an evidence-based question about organizational documents..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                disabled={isSubmitting}
                className="form-input"
                style={{ flex: 1, height: 44, fontSize: 'var(--text-sm)' }}
                autoFocus
              />
              <Button
                type="submit"
                variant="primary"
                disabled={!questionText.trim() || isSubmitting}
                isLoading={isSubmitting}
                style={{ height: 44, padding: '0 var(--space-5)' }}
                icon={Send}
              >
                Ask
              </Button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <span>Answers are restricted to current authorized documents and prompt isolation delimiters.</span>
              <span>Max 2000 characters</span>
            </div>
          </form>
        </div>
      </div>

      {/* Answer Feedback Dialog */}
      <Dialog
        isOpen={!!feedbackMessage}
        onClose={() => setFeedbackMessage(null)}
        title="Evaluate Answer Grounding & Accuracy"
        description="Help improve retrieval and answer accuracy by rating this response."
      >
        <form onSubmit={handleSubmitFeedback}>
          <div className="form-group">
            <label className="form-label">Overall Rating (1 to 5 Stars)</label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', margin: 'var(--space-2) 0' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackRating(star)}
                  style={{
                    padding: '6px',
                    borderRadius: 'var(--radius-xs)',
                    color: star <= feedbackRating ? '#eab308' : 'var(--border-medium)',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                  }}
                  aria-label={`Rate ${star} stars`}
                >
                  <Star size={24} fill={star <= feedbackRating ? '#eab308' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', margin: 'var(--space-4) 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isIncorrect}
                onChange={(e) => setIsIncorrect(e.target.checked)}
              />
              <span>Contains factual errors or hallucinated facts</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isUnsupported}
                onChange={(e) => setIsUnsupported(e.target.checked)}
              />
              <span>Citations do not support the claimed answer</span>
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Additional Feedback Notes (Optional)</label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Explain any discrepancies, contradictions, or missing information..."
              className="form-textarea"
              rows={3}
              maxLength={2000}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
            <Button
              variant="secondary"
              onClick={() => setFeedbackMessage(null)}
              disabled={isSubmittingFeedback}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmittingFeedback}
            >
              Submit Feedback
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
