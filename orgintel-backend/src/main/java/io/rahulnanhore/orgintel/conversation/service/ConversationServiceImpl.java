package io.rahulnanhore.orgintel.conversation.service;

import io.rahulnanhore.orgintel.ai.citation.Citation;
import io.rahulnanhore.orgintel.ai.service.GroundedAnswer;
import io.rahulnanhore.orgintel.ai.service.GroundedAnsweringService;
import io.rahulnanhore.orgintel.common.exception.ForbiddenException;
import io.rahulnanhore.orgintel.common.exception.ResourceNotFoundException;
import io.rahulnanhore.orgintel.conversation.domain.AnswerCitation;
import io.rahulnanhore.orgintel.conversation.domain.AnswerFeedback;
import io.rahulnanhore.orgintel.conversation.domain.Conversation;
import io.rahulnanhore.orgintel.conversation.domain.Message;
import io.rahulnanhore.orgintel.conversation.domain.MessageRole;
import io.rahulnanhore.orgintel.conversation.dto.*;
import io.rahulnanhore.orgintel.conversation.repository.AnswerCitationRepository;
import io.rahulnanhore.orgintel.conversation.repository.AnswerFeedbackRepository;
import io.rahulnanhore.orgintel.conversation.repository.ConversationRepository;
import io.rahulnanhore.orgintel.conversation.repository.MessageRepository;
import io.rahulnanhore.orgintel.document.domain.DocumentChunk;
import io.rahulnanhore.orgintel.document.domain.DocumentVersion;
import io.rahulnanhore.orgintel.document.repository.DocumentChunkRepository;
import io.rahulnanhore.orgintel.identity.domain.User;
import io.rahulnanhore.orgintel.identity.repository.UserRepository;
import io.rahulnanhore.orgintel.organization.domain.MembershipStatus;
import io.rahulnanhore.orgintel.organization.domain.Organization;
import io.rahulnanhore.orgintel.organization.repository.MembershipRepository;
import io.rahulnanhore.orgintel.organization.repository.OrganizationRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class ConversationServiceImpl implements ConversationService {

    private static final Logger log = LoggerFactory.getLogger(ConversationServiceImpl.class);

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final AnswerCitationRepository citationRepository;
    private final AnswerFeedbackRepository feedbackRepository;
    private final DocumentChunkRepository chunkRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final MembershipRepository membershipRepository;
    private final GroundedAnsweringService groundedAnsweringService;
    private final TransactionTemplate transactionTemplate;

    public ConversationServiceImpl(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            AnswerCitationRepository citationRepository,
            AnswerFeedbackRepository feedbackRepository,
            DocumentChunkRepository chunkRepository,
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            MembershipRepository membershipRepository,
            GroundedAnsweringService groundedAnsweringService,
            PlatformTransactionManager transactionManager) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.citationRepository = citationRepository;
        this.feedbackRepository = feedbackRepository;
        this.chunkRepository = chunkRepository;
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
        this.groundedAnsweringService = groundedAnsweringService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    @Transactional
    public ConversationResponse createConversation(UUID organizationId, UUID userId, CreateConversationRequest request) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + organizationId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        validateActiveMembership(userId, organizationId);

        String title = (request != null && request.title() != null && !request.title().isBlank())
                ? request.title().trim()
                : "New Conversation";

        Conversation conversation = new Conversation(UUID.randomUUID(), organization, user, title);
        conversation = conversationRepository.save(conversation);
        return new ConversationResponse(conversation.getId(), conversation.getTitle(), conversation.getCreatedAt(), conversation.getUpdatedAt());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ConversationResponse> listConversations(UUID organizationId, UUID userId, Pageable pageable) {
        validateActiveMembership(userId, organizationId);
        return conversationRepository.findByOrganizationIdAndUserIdOrderByUpdatedAtDesc(organizationId, userId, pageable)
                .map(c -> new ConversationResponse(c.getId(), c.getTitle(), c.getCreatedAt(), c.getUpdatedAt()));
    }

    @Override
    @Transactional(readOnly = true)
    public ConversationDetailResponse getConversation(UUID organizationId, UUID conversationId, UUID userId) {
        Conversation conversation = getAuthorizedConversation(organizationId, conversationId, userId);
        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);

        List<MessageResponse> messageResponses = new ArrayList<>();
        int seq = 1;
        for (Message msg : messages) {
            List<CitationResponse> citations = new ArrayList<>();
            Integer feedbackRating = null;
            if (msg.getRole() == MessageRole.ASSISTANT) {
                List<AnswerCitation> citationEntities = citationRepository.findByMessageIdOrderByCitationOrderAsc(msg.getId());
                citations = citationEntities.stream()
                        .map(c -> new CitationResponse(
                                c.getCitationOrder(),
                                c.getChunk() != null ? c.getChunk().getId() : null,
                                c.getDocumentVersion() != null ? c.getDocumentVersion().getId() : null,
                                c.getSourceLocation(),
                                c.getQuotedText()
                        ))
                        .toList();
                feedbackRating = feedbackRepository.findByMessageIdAndUserId(msg.getId(), userId)
                        .map(AnswerFeedback::getRating)
                        .orElse(null);
            }
            messageResponses.add(new MessageResponse(
                    msg.getId(),
                    msg.getRole(),
                    msg.getContent(),
                    seq++,
                    citations,
                    msg.getCreatedAt(),
                    feedbackRating
            ));
        }

        return new ConversationDetailResponse(
                conversation.getId(),
                conversation.getTitle(),
                conversation.getCreatedAt(),
                conversation.getUpdatedAt(),
                messageResponses
        );
    }

    @Override
    @Transactional
    public MessageResponse askQuestion(UUID organizationId, UUID conversationId, UUID userId, AskQuestionRequest request) {
        Conversation conversation = getAuthorizedConversation(organizationId, conversationId, userId);
        List<Message> priorMessages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);

        // 1. Save user message
        Message userMessage = new Message(UUID.randomUUID(), conversation, MessageRole.USER, request.question());
        messageRepository.save(userMessage);

        // Update title if still default
        if ("New Conversation".equals(conversation.getTitle())) {
            String snippet = request.question().strip();
            if (snippet.length() > 50) {
                snippet = snippet.substring(0, 47) + "...";
            }
            conversation.setTitle(snippet);
        }

        // 2. Generate grounded answer
        GroundedAnswer answer = groundedAnsweringService.generateGroundedAnswer(
                organizationId,
                userId,
                request.question()
        );

        // 3. Save assistant message
        Message assistantMessage = new Message(UUID.randomUUID(), conversation, MessageRole.ASSISTANT, answer.answerText());
        assistantMessage.setHasInsufficientEvidence(answer.hasInsufficientEvidence());
        assistantMessage.setHasConflictingEvidence(answer.hasConflictingEvidence());
        assistantMessage.setModelName(answer.modelName());
        assistantMessage.setPromptTokens(answer.promptTokens());
        assistantMessage.setCompletionTokens(answer.completionTokens());
        assistantMessage.setLatencyMs(answer.latencyMs());
        assistantMessage = messageRepository.save(assistantMessage);

        // 4. Save citations linked to message and chunk
        List<CitationResponse> citationResponses = new ArrayList<>();
        if (answer.citations() != null) {
            for (Citation c : answer.citations()) {
                DocumentChunk chunk = c.chunkId() != null ? chunkRepository.findById(c.chunkId()).orElse(null) : null;
                DocumentVersion version = chunk != null ? chunk.getVersion() : null;

                AnswerCitation citation = new AnswerCitation(
                        UUID.randomUUID(),
                        assistantMessage,
                        chunk,
                        version,
                        c.citationOrder(),
                        c.sourceLocation(),
                        c.snippet()
                );
                citationRepository.save(citation);

                citationResponses.add(new CitationResponse(
                        c.citationOrder(),
                        chunk != null ? chunk.getId() : null,
                        version != null ? version.getId() : null,
                        c.sourceLocation(),
                        c.snippet()
                ));
            }
        }

        conversation.setUpdatedAt(Instant.now());
        conversationRepository.save(conversation);

        int totalMessages = priorMessages.size() + 2;
        return new MessageResponse(
                assistantMessage.getId(),
                assistantMessage.getRole(),
                assistantMessage.getContent(),
                totalMessages,
                citationResponses,
                assistantMessage.getCreatedAt(),
                null
        );
    }

    @Override
    public SseEmitter askQuestionStream(UUID organizationId, UUID conversationId, UUID userId, AskQuestionRequest request) {
        Conversation conversation = getAuthorizedConversation(organizationId, conversationId, userId);
        List<Message> priorMessages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);

        // 1. Save user message immediately in its own transaction
        transactionTemplate.executeWithoutResult(status -> {
            Message userMessage = new Message(UUID.randomUUID(), conversation, MessageRole.USER, request.question());
            messageRepository.save(userMessage);

            if ("New Conversation".equals(conversation.getTitle())) {
                String snippet = request.question().strip();
                if (snippet.length() > 50) {
                    snippet = snippet.substring(0, 47) + "...";
                }
                conversation.setTitle(snippet);
                conversationRepository.save(conversation);
            }
        });

        // 2. Prepare grounded stream (single-turn query, no chat history sent to AI)
        GroundedAnsweringService.GroundedStreamContext streamContext =
                groundedAnsweringService.prepareGroundedStream(organizationId, userId, request.question());

        SseEmitter emitter = new SseEmitter(180_000L);
        StringBuilder rawResponseBuilder = new StringBuilder();

        emitter.onTimeout(emitter::complete);
        emitter.onError(e -> emitter.complete());

        streamContext.stream().subscribe(
                token -> {
                    rawResponseBuilder.append(token);
                    try {
                        emitter.send(SseEmitter.event()
                                .name("delta")
                                .data(Collections.singletonMap("text", token)));
                    } catch (IOException e) {
                        emitter.complete();
                    }
                },
                error -> {
                    try {
                        emitter.send(SseEmitter.event()
                                .name("error")
                                .data(Collections.singletonMap("message", error.getMessage())));
                    } catch (IOException ignored) {
                    }
                    emitter.complete();
                },
                () -> {
                    try {
                        String fullRawText = rawResponseBuilder.toString();
                        GroundedAnswer answer = groundedAnsweringService.finalizeStreamAnswer(
                                fullRawText,
                                streamContext.passages(),
                                streamContext.startTime()
                        );

                        MessageResponse response = transactionTemplate.execute(status -> {
                            Message assistantMessage = new Message(
                                    UUID.randomUUID(),
                                    conversation,
                                    MessageRole.ASSISTANT,
                                    answer.answerText()
                            );
                            assistantMessage.setHasInsufficientEvidence(answer.hasInsufficientEvidence());
                            assistantMessage.setHasConflictingEvidence(answer.hasConflictingEvidence());
                            assistantMessage.setModelName(answer.modelName());
                            assistantMessage.setLatencyMs(answer.latencyMs());
                            assistantMessage = messageRepository.save(assistantMessage);

                            List<CitationResponse> citationResponses = new ArrayList<>();
                            if (answer.citations() != null) {
                                for (Citation c : answer.citations()) {
                                    DocumentChunk chunk = c.chunkId() != null
                                            ? chunkRepository.findById(c.chunkId()).orElse(null)
                                            : null;
                                    DocumentVersion version = chunk != null ? chunk.getVersion() : null;

                                    AnswerCitation citation = new AnswerCitation(
                                            UUID.randomUUID(),
                                            assistantMessage,
                                            chunk,
                                            version,
                                            c.citationOrder(),
                                            c.sourceLocation(),
                                            c.snippet()
                                    );
                                    citationRepository.save(citation);

                                    citationResponses.add(new CitationResponse(
                                            c.citationOrder(),
                                            chunk != null ? chunk.getId() : null,
                                            version != null ? version.getId() : null,
                                            c.sourceLocation(),
                                            c.snippet()
                                    ));
                                }
                            }

                            conversation.setUpdatedAt(Instant.now());
                            conversationRepository.save(conversation);

                            int totalMessages = priorMessages.size() + 2;
                            return new MessageResponse(
                                    assistantMessage.getId(),
                                    assistantMessage.getRole(),
                                    assistantMessage.getContent(),
                                    totalMessages,
                                    citationResponses,
                                    assistantMessage.getCreatedAt(),
                                    null
                            );
                        });

                        emitter.send(SseEmitter.event()
                                .name("complete")
                                .data(response));
                        emitter.complete();
                    } catch (Exception ex) {
                        System.out.println("STREAM ONCOMPLETE EXCEPTION: " + ex);
                        ex.printStackTrace();
                        try {
                            emitter.send(SseEmitter.event()
                                    .name("error")
                                    .data(Collections.singletonMap("message", ex.getMessage())));
                        } catch (IOException ignored) {
                        }
                        emitter.complete();
                    }
                }
        );

        return emitter;
    }

    @Override
    @Transactional
    public void submitFeedback(UUID organizationId, UUID conversationId, UUID messageId, UUID userId, SubmitFeedbackRequest request) {
        Conversation conversation = getAuthorizedConversation(organizationId, conversationId, userId);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found: " + messageId));

        if (!message.getConversation().getId().equals(conversation.getId())) {
            throw new ResourceNotFoundException("Message does not belong to conversation: " + conversationId);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        AnswerFeedback feedback = feedbackRepository.findByMessageIdAndUserId(messageId, userId)
                .orElse(new AnswerFeedback(
                        UUID.randomUUID(),
                        message,
                        user,
                        request.rating(),
                        Boolean.TRUE.equals(request.isIncorrect()),
                        Boolean.TRUE.equals(request.isUnsupported()),
                        request.feedbackText()
                ));

        feedback.setRating(request.rating());
        feedback.setIncorrect(Boolean.TRUE.equals(request.isIncorrect()));
        feedback.setUnsupported(Boolean.TRUE.equals(request.isUnsupported()));
        feedback.setFeedbackText(request.feedbackText());

        feedbackRepository.save(feedback);
    }

    @Override
    @Transactional
    public void deleteConversation(UUID organizationId, UUID conversationId, UUID userId) {
        Conversation conversation = getAuthorizedConversation(organizationId, conversationId, userId);
        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        for (Message m : messages) {
            List<AnswerCitation> citations = citationRepository.findByMessageIdOrderByCitationOrderAsc(m.getId());
            citationRepository.deleteAll(citations);
            feedbackRepository.deleteByMessageId(m.getId());
        }
        messageRepository.deleteAll(messages);
        conversationRepository.delete(conversation);
    }

    private Conversation getAuthorizedConversation(UUID organizationId, UUID conversationId, UUID userId) {
        validateActiveMembership(userId, organizationId);

        Conversation conversation = conversationRepository.findByIdAndOrganizationId(conversationId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found: " + conversationId));

        if (!conversation.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Access denied: You do not have permission to access this conversation");
        }
        return conversation;
    }

    private void validateActiveMembership(UUID userId, UUID organizationId) {
        boolean active = membershipRepository.findByUserIdAndOrganizationId(userId, organizationId)
                .map(m -> m.getStatus() == MembershipStatus.ACTIVE)
                .orElse(false);

        if (!active) {
            throw new ForbiddenException("Access denied: You are not an active member of this organization");
        }
    }
}
