package io.rahulnanhore.orgintel.document.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.rahulnanhore.orgintel.document.domain.DocumentChunk;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, UUID> {
    List<DocumentChunk> findByVersionIdOrderByChunkIndexAsc(UUID versionId);

    @Modifying
    @Query("DELETE FROM DocumentChunk c WHERE c.version.id = :versionId")
    void deleteByVersionId(@Param("versionId") UUID versionId);

    @Query("SELECT c.id FROM DocumentChunk c WHERE c.document.id = :documentId")
    List<UUID> findChunkIdsByDocumentId(@Param("documentId") UUID documentId);

    @Query("SELECT c.id FROM DocumentChunk c WHERE c.version.id = :versionId")
    List<UUID> findChunkIdsByVersionId(@Param("versionId") UUID versionId);

    @Query("SELECT c.id FROM DocumentChunk c WHERE c.document.id = :documentId AND c.version.id != :versionId")
    List<UUID> findChunkIdsByDocumentIdAndVersionIdNot(@Param("documentId") UUID documentId, @Param("versionId") UUID versionId);

    // 1. Native PostgreSQL Full-Text Keyword Search (GIN Index on tsv_content)
    @Query(value = """
        SELECT c.* FROM document_chunks c
        JOIN documents d ON c.document_id = d.id
        JOIN document_versions v ON c.version_id = v.id
        WHERE c.organization_id = CAST(:orgId AS uuid)
          AND d.status = 'ACTIVE'
          AND d.current_version_id = v.id
          AND v.processing_state = 'COMPLETED'
          AND (
            CAST(:isAdmin AS boolean) = true
            OR d.owner_id = CAST(:userId AS uuid)
            OR d.visibility = 'ORGANIZATION'
            OR EXISTS (
                SELECT 1 FROM document_permissions p
                WHERE p.document_id = d.id AND p.user_id = CAST(:userId AS uuid)
            )
          )
          AND (c.tsv_content @@ plainto_tsquery('english', CAST(:query AS text)) OR c.content ILIKE ('%' || CAST(:query AS text) || '%'))
        ORDER BY ts_rank(c.tsv_content, plainto_tsquery('english', CAST(:query AS text))) DESC
        LIMIT :limit
    """, nativeQuery = true)
    List<DocumentChunk> searchKeyword(
            @Param("orgId") UUID orgId,
            @Param("userId") UUID userId,
            @Param("isAdmin") boolean isAdmin,
            @Param("query") String query,
            @Param("limit") int limit
    );
}
