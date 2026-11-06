package io.rahulnanhore.orgintel.conversation.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "messages", indexes = {
        @Index(name = "idx_messages_conversation", columnList = "conversation_id, created_at")
})
public class Message {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 50)
    private MessageRole role;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "has_insufficient_evidence")
    private Boolean hasInsufficientEvidence = false;

    @Column(name = "has_conflicting_evidence")
    private Boolean hasConflictingEvidence = false;

    @Column(name = "model_name", length = 100)
    private String modelName;

    @Column(name = "prompt_tokens")
    private Integer promptTokens;

    @Column(name = "completion_tokens")
    private Integer completionTokens;

    @Column(name = "latency_ms")
    private Long latencyMs;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Message() {
    }

    public Message(UUID id, Conversation conversation, MessageRole role, String content) {
        this.id = id != null ? id : UUID.randomUUID();
        this.conversation = conversation;
        this.role = role;
        this.content = content;
        this.hasInsufficientEvidence = false;
        this.hasConflictingEvidence = false;
        this.createdAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Conversation getConversation() {
        return conversation;
    }

    public void setConversation(Conversation conversation) {
        this.conversation = conversation;
    }

    public MessageRole getRole() {
        return role;
    }

    public void setRole(MessageRole role) {
        this.role = role;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Boolean getHasInsufficientEvidence() {
        return hasInsufficientEvidence;
    }

    public void setHasInsufficientEvidence(Boolean hasInsufficientEvidence) {
        this.hasInsufficientEvidence = hasInsufficientEvidence;
    }

    public Boolean getHasConflictingEvidence() {
        return hasConflictingEvidence;
    }

    public void setHasConflictingEvidence(Boolean hasConflictingEvidence) {
        this.hasConflictingEvidence = hasConflictingEvidence;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public Integer getPromptTokens() {
        return promptTokens;
    }

    public void setPromptTokens(Integer promptTokens) {
        this.promptTokens = promptTokens;
    }

    public Integer getCompletionTokens() {
        return completionTokens;
    }

    public void setCompletionTokens(Integer completionTokens) {
        this.completionTokens = completionTokens;
    }

    public Long getLatencyMs() {
        return latencyMs;
    }

    public void setLatencyMs(Long latencyMs) {
        this.latencyMs = latencyMs;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
