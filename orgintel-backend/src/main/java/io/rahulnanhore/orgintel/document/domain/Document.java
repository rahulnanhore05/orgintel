package io.rahulnanhore.orgintel.document.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

import io.rahulnanhore.orgintel.identity.domain.User;
import io.rahulnanhore.orgintel.organization.domain.Organization;

@Entity
@Table(name = "documents", indexes = {
        @Index(name = "idx_documents_org_status", columnList = "organization_id, status"),
        @Index(name = "idx_documents_owner", columnList = "owner_id")
})
public class Document {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false, length = 50)
    private DocumentVisibility visibility = DocumentVisibility.ORGANIZATION;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_version_id")
    private DocumentVersion currentVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private DocumentStatus status = DocumentStatus.ACTIVE;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Document() {
    }

    public Document(
            UUID id,
            Organization organization,
            User owner,
            String title,
            String description,
            DocumentVisibility visibility) {
        this.id = id != null ? id : UUID.randomUUID();
        this.organization = organization;
        this.owner = owner;
        this.title = title;
        this.description = description;
        this.visibility = visibility != null ? visibility : DocumentVisibility.ORGANIZATION;
        this.status = DocumentStatus.ACTIVE;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = Instant.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public void markDeleted() {
        this.status = DocumentStatus.DELETED;
        this.deletedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Organization getOrganization() {
        return organization;
    }

    public void setOrganization(Organization organization) {
        this.organization = organization;
    }

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public DocumentVisibility getVisibility() {
        return visibility;
    }

    public void setVisibility(DocumentVisibility visibility) {
        this.visibility = visibility;
    }

    public DocumentVersion getCurrentVersion() {
        return currentVersion;
    }

    public void setCurrentVersion(DocumentVersion currentVersion) {
        this.currentVersion = currentVersion;
    }

    public DocumentStatus getStatus() {
        return status;
    }

    public void setStatus(DocumentStatus status) {
        this.status = status;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
