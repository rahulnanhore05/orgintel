package io.rahulnanhore.orgintel.ingestion.dto;

import java.time.Instant;
import java.util.UUID;

import io.rahulnanhore.orgintel.ingestion.domain.IngestionJob;
import io.rahulnanhore.orgintel.ingestion.domain.JobStatus;

public record JobResponse(
        UUID id,
        UUID versionId,
        UUID documentId,
        int versionNumber,
        JobStatus status,
        int attemptCount,
        int maxAttempts,
        String failureReason,
        Instant createdAt,
        Instant updatedAt
) {
    public static JobResponse from(IngestionJob job) {
        return new JobResponse(
                job.getId(),
                job.getVersion().getId(),
                job.getVersion().getDocument().getId(),
                job.getVersion().getVersionNumber(),
                job.getStatus(),
                job.getAttemptCount(),
                job.getMaxAttempts(),
                job.getFailureReason(),
                job.getCreatedAt(),
                job.getUpdatedAt()
        );
    }
}
