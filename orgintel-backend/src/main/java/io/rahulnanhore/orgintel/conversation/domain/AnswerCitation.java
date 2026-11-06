package io.rahulnanhore.orgintel.conversation.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

import io.rahulnanhore.orgintel.document.domain.DocumentChunk;
import io.rahulnanhore.orgintel.document.domain.DocumentVersion;

@Entity
@Table(name = "answer_citations", indexes = {
        @Index(name = "idx_citations_message", columnList = "message_id, citation_order"),
        @Index(name = "idx_citations_chunk", columnList = "chunk_id")
})
public class AnswerCitation {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chunk_id")
    private DocumentChunk chunk;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_version_id")
    private DocumentVersion documentVersion;

    @Column(name = "citation_order", nullable = false)
    private int citationOrder;

    @Column(name = "source_location")
    private String sourceLocation;

    @Column(name = "quoted_text", columnDefinition = "TEXT")
    private String quotedText;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public AnswerCitation() {
    }

    public AnswerCitation(
            UUID id,
            Message message,
            DocumentChunk chunk,
            DocumentVersion documentVersion,
            int citationOrder,
            String sourceLocation,
            String quotedText) {
        this.id = id != null ? id : UUID.randomUUID();
        this.message = message;
        this.chunk = chunk;
        this.documentVersion = documentVersion;
        this.citationOrder = citationOrder;
        this.sourceLocation = sourceLocation;
        this.quotedText = quotedText;
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

    public Message getMessage() {
        return message;
    }

    public void setMessage(Message message) {
        this.message = message;
    }

    public DocumentChunk getChunk() {
        return chunk;
    }

    public void setChunk(DocumentChunk chunk) {
        this.chunk = chunk;
    }

    public DocumentVersion getDocumentVersion() {
        return documentVersion;
    }

    public void setDocumentVersion(DocumentVersion documentVersion) {
        this.documentVersion = documentVersion;
    }

    public int getCitationOrder() {
        return citationOrder;
    }

    public void setCitationOrder(int citationOrder) {
        this.citationOrder = citationOrder;
    }

    public String getSourceLocation() {
        return sourceLocation;
    }

    public void setSourceLocation(String sourceLocation) {
        this.sourceLocation = sourceLocation;
    }

    public String getQuotedText() {
        return quotedText;
    }

    public void setQuotedText(String quotedText) {
        this.quotedText = quotedText;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
