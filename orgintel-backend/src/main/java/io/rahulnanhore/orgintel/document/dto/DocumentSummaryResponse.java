package io.rahulnanhore.orgintel.document.dto;

import java.time.Instant;
import java.util.UUID;

import io.rahulnanhore.orgintel.document.domain.Document;
import io.rahulnanhore.orgintel.document.domain.DocumentStatus;
import io.rahulnanhore.orgintel.document.domain.DocumentVisibility;

public record DocumentSummaryResponse(
        UUID id,
        String title,
        String description,
        DocumentVisibility visibility,
        DocumentStatus status,
        String ownerName,
        Integer currentVersionNumber,
        Instant createdAt,
        Instant updatedAt
) {
    public static DocumentSummaryResponse from(Document doc) {
        Integer versionNumber = doc.getCurrentVersion() != null ? doc.getCurrentVersion().getVersionNumber() : null;
        return new DocumentSummaryResponse(
                doc.getId(),
                doc.getTitle(),
                doc.getDescription(),
                doc.getVisibility(),
                doc.getStatus(),
                doc.getOwner().getFullName(),
                versionNumber,
                doc.getCreatedAt(),
                doc.getUpdatedAt()
        );
    }
}
