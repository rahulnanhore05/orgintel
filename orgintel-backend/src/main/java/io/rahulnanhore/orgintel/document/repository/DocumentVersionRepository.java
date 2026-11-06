package io.rahulnanhore.orgintel.document.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.rahulnanhore.orgintel.document.domain.DocumentVersion;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, UUID> {
    List<DocumentVersion> findByDocumentIdOrderByVersionNumberDesc(UUID documentId);
    Optional<DocumentVersion> findByDocumentIdAndVersionNumber(UUID documentId, int versionNumber);
    Optional<DocumentVersion> findTopByDocumentIdOrderByVersionNumberDesc(UUID documentId);
}
