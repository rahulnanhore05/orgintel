package io.rahulnanhore.orgintel.organization.dto;

import io.rahulnanhore.orgintel.organization.domain.OrgRole;
import jakarta.validation.constraints.NotNull;

public record UpdateRoleRequest(
        @NotNull(message = "Role is required")
        OrgRole role
) {
}
