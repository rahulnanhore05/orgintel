package io.rahulnanhore.orgintel.document.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.rahulnanhore.orgintel.document.domain.DocumentPermission;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentPermissionRepository extends JpaRepository<DocumentPermission, UUID> {
    Optional<DocumentPermission> findByDocumentIdAndUserId(UUID documentId, UUID userId);
    boolean existsByDocumentIdAndUserId(UUID documentId, UUID userId);
    List<DocumentPermission> findByDocumentId(UUID documentId);

    @org.springframework.data.jpa.repository.Query("SELECT p.document.id FROM DocumentPermission p WHERE p.document.organization.id = :organizationId AND p.user.id = :userId")
    List<UUID> findGrantedDocumentIds(
            @org.springframework.data.repository.query.Param("organizationId") UUID organizationId,
            @org.springframework.data.repository.query.Param("userId") UUID userId
    );
}
