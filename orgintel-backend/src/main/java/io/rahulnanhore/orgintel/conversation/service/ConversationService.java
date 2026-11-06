package io.rahulnanhore.orgintel.conversation.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import io.rahulnanhore.orgintel.conversation.dto.*;

import java.util.UUID;

public interface ConversationService {
    ConversationResponse createConversation(UUID organizationId, UUID userId, CreateConversationRequest request);
    Page<ConversationResponse> listConversations(UUID organizationId, UUID userId, Pageable pageable);
    ConversationDetailResponse getConversation(UUID organizationId, UUID conversationId, UUID userId);
    MessageResponse askQuestion(UUID organizationId, UUID conversationId, UUID userId, AskQuestionRequest request);
    SseEmitter askQuestionStream(UUID organizationId, UUID conversationId, UUID userId, AskQuestionRequest request);
    void submitFeedback(UUID organizationId, UUID conversationId, UUID messageId, UUID userId, SubmitFeedbackRequest request);
    void deleteConversation(UUID organizationId, UUID conversationId, UUID userId);
}
