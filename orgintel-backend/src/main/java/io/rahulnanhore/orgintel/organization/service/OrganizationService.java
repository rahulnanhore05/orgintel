package io.rahulnanhore.orgintel.organization.service;

import io.rahulnanhore.orgintel.organization.dto.CreateOrganizationRequest;
import io.rahulnanhore.orgintel.organization.dto.OrganizationSummaryResponse;
import io.rahulnanhore.orgintel.organization.domain.Organization;

import java.util.List;
import java.util.UUID;

public interface OrganizationService {
    OrganizationSummaryResponse createOrganization(CreateOrganizationRequest request, UUID creatorUserId);
    OrganizationSummaryResponse getOrganization(UUID organizationId, UUID requestingUserId);
    List<OrganizationSummaryResponse> listUserOrganizations(UUID userId);
    Organization getEntity(UUID organizationId);
}
