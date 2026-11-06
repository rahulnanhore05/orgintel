package io.rahulnanhore.orgintel.document.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

import io.rahulnanhore.orgintel.identity.domain.User;

@Entity
@Table(name = "document_permissions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_doc_user_perm", columnNames = {"document_id", "user_id"})
        },
        indexes = {
                @Index(name = "idx_doc_permissions_doc", columnList = "document_id"),
                @Index(name = "idx_doc_permissions_user", columnList = "user_id")
        }
)
public class DocumentPermission {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "permission_level", nullable = false, length = 50)
    private PermissionLevel permissionLevel = PermissionLevel.READ;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "granted_by")
    private User grantedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public DocumentPermission() {
    }

    public DocumentPermission(
            UUID id,
            Document document,
            User user,
            PermissionLevel permissionLevel,
            User grantedBy) {
        this.id = id != null ? id : UUID.randomUUID();
        this.document = document;
        this.user = user;
        this.permissionLevel = permissionLevel != null ? permissionLevel : PermissionLevel.READ;
        this.grantedBy = grantedBy;
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

    public Document getDocument() {
        return document;
    }

    public void setDocument(Document document) {
        this.document = document;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public PermissionLevel getPermissionLevel() {
        return permissionLevel;
    }

    public void setPermissionLevel(PermissionLevel permissionLevel) {
        this.permissionLevel = permissionLevel;
    }

    public User getGrantedBy() {
        return grantedBy;
    }

    public void setGrantedBy(User grantedBy) {
        this.grantedBy = grantedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
