package io.rahulnanhore.orgintel.organization.dto;

import io.rahulnanhore.orgintel.organization.domain.OrgStatus;
import io.rahulnanhore.orgintel.organization.domain.OrgRole;

import java.util.UUID;

public record OrganizationSummaryResponse(
        UUID id,
        String name,
        String slug,
        OrgStatus status,
        OrgRole role
) {
}
