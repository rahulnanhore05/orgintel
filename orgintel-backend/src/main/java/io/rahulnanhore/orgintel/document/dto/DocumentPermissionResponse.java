package io.rahulnanhore.orgintel.document.dto;

import io.rahulnanhore.orgintel.document.domain.DocumentPermission;
import io.rahulnanhore.orgintel.document.domain.PermissionLevel;

import java.time.Instant;
import java.util.UUID;

public record DocumentPermissionResponse(
        UUID id,
        UUID userId,
        String userEmail,
        String userFullName,
        PermissionLevel permissionLevel,
        Instant createdAt
) {
    public static DocumentPermissionResponse from(DocumentPermission p) {
        return new DocumentPermissionResponse(
                p.getId(),
                p.getUser().getId(),
                p.getUser().getEmail(),
                p.getUser().getFullName(),
                p.getPermissionLevel(),
                p.getCreatedAt()
        );
    }
}
