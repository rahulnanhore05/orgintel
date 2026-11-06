package io.rahulnanhore.orgintel.document.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.rahulnanhore.orgintel.document.domain.Document;
import io.rahulnanhore.orgintel.document.domain.DocumentStatus;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    Optional<Document> findByIdAndOrganizationIdAndStatus(UUID id, UUID organizationId, DocumentStatus status);

    @Query("""
        SELECT d FROM Document d
        WHERE d.organization.id = :orgId
          AND d.status = io.rahulnanhore.orgintel.document.domain.DocumentStatus.ACTIVE
          AND (
            :isAdmin = true
            OR d.owner.id = :userId
            OR d.visibility = io.rahulnanhore.orgintel.document.domain.DocumentVisibility.ORGANIZATION
            OR EXISTS (
                SELECT 1 FROM DocumentPermission p
                WHERE p.document.id = d.id AND p.user.id = :userId
            )
          )
    """)
    Page<Document> findAuthorizedDocuments(
            @Param("orgId") UUID orgId,
            @Param("userId") UUID userId,
            @Param("isAdmin") boolean isAdmin,
            Pageable pageable
    );
}
