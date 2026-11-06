package io.rahulnanhore.orgintel.document.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

import io.rahulnanhore.orgintel.organization.domain.Organization;

@Entity
@Table(name = "document_chunks", indexes = {
        @Index(name = "idx_chunks_version_idx", columnList = "version_id, chunk_index"),
        @Index(name = "idx_chunks_doc", columnList = "document_id"),
        @Index(name = "idx_chunks_org", columnList = "organization_id")
})
public class DocumentChunk {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "version_id", nullable = false)
    private DocumentVersion version;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "chunk_index", nullable = false)
    private int chunkIndex;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "token_count")
    private Integer tokenCount;

    @Column(name = "page_number")
    private Integer pageNumber;

    @Column(name = "section_title")
    private String sectionTitle;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public DocumentChunk() {
    }

    public DocumentChunk(
            UUID id,
            DocumentVersion version,
            Document document,
            Organization organization,
            int chunkIndex,
            String content,
            Integer tokenCount,
            Integer pageNumber,
            String sectionTitle) {
        this.id = id != null ? id : UUID.randomUUID();
        this.version = version;
        this.document = document;
        this.organization = organization;
        this.chunkIndex = chunkIndex;
        this.content = content;
        this.tokenCount = tokenCount;
        this.pageNumber = pageNumber;
        this.sectionTitle = sectionTitle;
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

    public DocumentVersion getVersion() {
        return version;
    }

    public void setVersion(DocumentVersion version) {
        this.version = version;
    }

    public Document getDocument() {
        return document;
    }

    public void setDocument(Document document) {
        this.document = document;
    }

    public Organization getOrganization() {
        return organization;
    }

    public void setOrganization(Organization organization) {
        this.organization = organization;
    }

    public int getChunkIndex() {
        return chunkIndex;
    }

    public void setChunkIndex(int chunkIndex) {
        this.chunkIndex = chunkIndex;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Integer getTokenCount() {
        return tokenCount;
    }

    public void setTokenCount(Integer tokenCount) {
        this.tokenCount = tokenCount;
    }

    public Integer getPageNumber() {
        return pageNumber;
    }

    public void setPageNumber(Integer pageNumber) {
        this.pageNumber = pageNumber;
    }

    public String getSectionTitle() {
        return sectionTitle;
    }

    public void setSectionTitle(String sectionTitle) {
        this.sectionTitle = sectionTitle;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
