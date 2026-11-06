package io.rahulnanhore.orgintel.document.dto;

import io.rahulnanhore.orgintel.document.domain.DocumentVersion;
import io.rahulnanhore.orgintel.document.domain.ProcessingState;

import java.time.Instant;
import java.util.UUID;

public record DocumentVersionResponse(
        UUID id,
        int versionNumber,
        String fileName,
        String contentType,
        long fileSize,
        ProcessingState processingState,
        Instant createdAt,
        Instant completedAt
) {
    public static DocumentVersionResponse from(DocumentVersion v) {
        return new DocumentVersionResponse(
                v.getId(),
                v.getVersionNumber(),
                v.getFileName(),
                v.getContentType(),
                v.getFileSize(),
                v.getProcessingState(),
                v.getCreatedAt(),
                v.getCompletedAt()
        );
    }
}
