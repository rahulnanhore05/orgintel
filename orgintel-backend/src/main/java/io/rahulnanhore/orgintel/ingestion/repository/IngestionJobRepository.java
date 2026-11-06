package io.rahulnanhore.orgintel.ingestion.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.rahulnanhore.orgintel.ingestion.domain.IngestionJob;
import io.rahulnanhore.orgintel.ingestion.domain.JobStatus;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IngestionJobRepository extends JpaRepository<IngestionJob, UUID> {
    Optional<IngestionJob> findByVersionId(UUID versionId);

    @Query("""
        SELECT j FROM IngestionJob j
        WHERE (j.status = 'QUEUED' OR (j.status = 'RUNNING' AND j.lockedUntil < :now))
          AND j.attemptCount < j.maxAttempts
        ORDER BY j.createdAt ASC
    """)
    List<IngestionJob> findClaimableJobs(@Param("now") Instant now, Pageable pageable);
}
