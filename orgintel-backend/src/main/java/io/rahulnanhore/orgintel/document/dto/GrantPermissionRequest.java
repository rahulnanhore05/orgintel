package io.rahulnanhore.orgintel.document.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

import io.rahulnanhore.orgintel.document.domain.PermissionLevel;

public record GrantPermissionRequest(
        @NotNull(message = "User ID is required")
        UUID userId,

        @NotNull(message = "Permission level is required")
        PermissionLevel permissionLevel
) {
}
