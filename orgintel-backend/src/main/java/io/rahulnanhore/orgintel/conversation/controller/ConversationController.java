package io.rahulnanhore.orgintel.conversation.controller;

import io.rahulnanhore.orgintel.conversation.dto.*;
import io.rahulnanhore.orgintel.conversation.service.ConversationService;
import io.rahulnanhore.orgintel.identity.config.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/conversations")
@Tag(name = "Conversations", description = "Endpoints for AI grounded conversations, messages, citations, and feedback")
@SecurityRequirement(name = "bearerAuth")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    @PostMapping
    @Operation(summary = "Start a new conversation")
    public ResponseEntity<ConversationResponse> createConversation(
            @PathVariable UUID organizationId,
            @RequestBody(required = false) @Valid CreateConversationRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        ConversationResponse response = conversationService.createConversation(organizationId, principal.userId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "List conversations for current user in organization")
    public ResponseEntity<Page<ConversationResponse>> listConversations(
            @PathVariable UUID organizationId,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        Page<ConversationResponse> response = conversationService.listConversations(organizationId, principal.userId(), pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{conversationId}")
    @Operation(summary = "Get conversation details with all messages and citations")
    public ResponseEntity<ConversationDetailResponse> getConversation(
            @PathVariable UUID organizationId,
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        ConversationDetailResponse response = conversationService.getConversation(organizationId, conversationId, principal.userId());
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/{conversationId}/messages/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Ask a question and stream response tokens via SSE")
    public SseEmitter askQuestionStream(
            @PathVariable UUID organizationId,
            @PathVariable UUID conversationId,
            @RequestBody @Valid AskQuestionRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return conversationService.askQuestionStream(organizationId, conversationId, principal.userId(), request);
    }

    @PostMapping(value = "/{conversationId}/messages", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Ask a question and stream response tokens via SSE (Accept: text/event-stream)")
    public SseEmitter askQuestionStreamAccept(
            @PathVariable UUID organizationId,
            @PathVariable UUID conversationId,
            @RequestBody @Valid AskQuestionRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return conversationService.askQuestionStream(organizationId, conversationId, principal.userId(), request);
    }

    @PostMapping(value = "/{conversationId}/messages", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Ask a question in conversation with grounded citations (non-streaming)")
    public ResponseEntity<MessageResponse> askQuestion(
            @PathVariable UUID organizationId,
            @PathVariable UUID conversationId,
            @RequestBody @Valid AskQuestionRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        MessageResponse response = conversationService.askQuestion(organizationId, conversationId, principal.userId(), request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{conversationId}/messages/{messageId}/feedback")
    @Operation(summary = "Submit feedback on an answer")
    public ResponseEntity<Void> submitFeedback(
            @PathVariable UUID organizationId,
            @PathVariable UUID conversationId,
            @PathVariable UUID messageId,
            @RequestBody @Valid SubmitFeedbackRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        conversationService.submitFeedback(organizationId, conversationId, messageId, principal.userId(), request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{conversationId}")
    @Operation(summary = "Delete a conversation")
    public ResponseEntity<Void> deleteConversation(
            @PathVariable UUID organizationId,
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        conversationService.deleteConversation(organizationId, conversationId, principal.userId());
        return ResponseEntity.noContent().build();
    }
}
