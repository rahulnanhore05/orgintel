package io.rahulnanhore.orgintel.organization.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

import io.rahulnanhore.orgintel.identity.domain.User;

@Entity
@Table(name = "memberships",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_memberships_user_org", columnNames = {"user_id", "organization_id"})
        },
        indexes = {
                @Index(name = "idx_memberships_org_user", columnList = "organization_id, user_id")
        }
)
public class Membership {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private OrgRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MembershipStatus status = MembershipStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Membership() {
    }

    public Membership(UUID id, User user, Organization organization, OrgRole role) {
        this.id = id != null ? id : UUID.randomUUID();
        this.user = user;
        this.organization = organization;
        this.role = role != null ? role : OrgRole.MEMBER;
        this.status = MembershipStatus.ACTIVE;
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

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Organization getOrganization() {
        return organization;
    }

    public void setOrganization(Organization organization) {
        this.organization = organization;
    }

    public OrgRole getRole() {
        return role;
    }

    public void setRole(OrgRole role) {
        this.role = role;
    }

    public MembershipStatus getStatus() {
        return status;
    }

    public void setStatus(MembershipStatus status) {
        this.status = status;
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
