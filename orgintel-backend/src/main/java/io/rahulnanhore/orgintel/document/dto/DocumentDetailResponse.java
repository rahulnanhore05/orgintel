package io.rahulnanhore.orgintel.document.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import io.rahulnanhore.orgintel.document.domain.Document;
import io.rahulnanhore.orgintel.document.domain.DocumentStatus;
import io.rahulnanhore.orgintel.document.domain.DocumentVisibility;
import io.rahulnanhore.orgintel.identity.dto.UserSummaryResponse;

public record DocumentDetailResponse(
        UUID id,
        String title,
        String description,
        DocumentVisibility visibility,
        DocumentStatus status,
        UserSummaryResponse owner,
        DocumentVersionResponse currentVersion,
        List<DocumentVersionResponse> versions,
        Instant createdAt,
        Instant updatedAt
) {
    public static DocumentDetailResponse of(Document doc, List<DocumentVersionResponse> versions) {
        DocumentVersionResponse current = doc.getCurrentVersion() != null
                ? DocumentVersionResponse.from(doc.getCurrentVersion())
                : null;

        UserSummaryResponse owner = new UserSummaryResponse(
                doc.getOwner().getId(),
                doc.getOwner().getEmail(),
                doc.getOwner().getFullName()
        );

        return new DocumentDetailResponse(
                doc.getId(),
                doc.getTitle(),
                doc.getDescription(),
                doc.getVisibility(),
                doc.getStatus(),
                owner,
                current,
                versions,
                doc.getCreatedAt(),
                doc.getUpdatedAt()
        );
    }
}
