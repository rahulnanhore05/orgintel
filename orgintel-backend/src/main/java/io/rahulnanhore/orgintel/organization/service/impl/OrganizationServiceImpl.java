package io.rahulnanhore.orgintel.organization.service.impl;

import io.rahulnanhore.orgintel.common.exception.ConflictException;
import io.rahulnanhore.orgintel.common.exception.ForbiddenException;
import io.rahulnanhore.orgintel.common.exception.ResourceNotFoundException;
import io.rahulnanhore.orgintel.identity.domain.User;
import io.rahulnanhore.orgintel.identity.repository.UserRepository;
import io.rahulnanhore.orgintel.organization.domain.Membership;
import io.rahulnanhore.orgintel.organization.domain.MembershipStatus;
import io.rahulnanhore.orgintel.organization.dto.CreateOrganizationRequest;
import io.rahulnanhore.orgintel.organization.dto.OrganizationSummaryResponse;
import io.rahulnanhore.orgintel.organization.repository.MembershipRepository;
import io.rahulnanhore.orgintel.organization.repository.OrganizationRepository;
import io.rahulnanhore.orgintel.organization.service.OrganizationService;
import io.rahulnanhore.orgintel.organization.domain.OrgRole;
import io.rahulnanhore.orgintel.organization.domain.Organization;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class OrganizationServiceImpl implements OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final MembershipRepository membershipRepository;
    private final UserRepository userRepository;

    public OrganizationServiceImpl(
            OrganizationRepository organizationRepository,
            MembershipRepository membershipRepository,
            UserRepository userRepository) {
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
    }

    @Override
    public OrganizationSummaryResponse createOrganization(CreateOrganizationRequest request, UUID creatorUserId) {
        String normalizedSlug = request.slug().toLowerCase().trim();

        if (organizationRepository.existsBySlug(normalizedSlug)) {
            throw new ConflictException("Organization with slug '" + normalizedSlug + "' already exists.");
        }

        User creator = userRepository.findById(creatorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Creator user not found."));

        Organization org = new Organization(UUID.randomUUID(), request.name().trim(), normalizedSlug);
        org = organizationRepository.save(org);

        // Creator automatically becomes ORG_ADMIN
        Membership adminMembership = new Membership(UUID.randomUUID(), creator, org, OrgRole.ORG_ADMIN);
        membershipRepository.save(adminMembership);

        return new OrganizationSummaryResponse(
                org.getId(),
                org.getName(),
                org.getSlug(),
                org.getStatus(),
                OrgRole.ORG_ADMIN
        );
    }

    @Override
    @Transactional(readOnly = true)
    public OrganizationSummaryResponse getOrganization(UUID organizationId, UUID requestingUserId) {
        Membership membership = membershipRepository.findByUserIdAndOrganizationId(requestingUserId, organizationId)
                .filter(m -> m.getStatus() == MembershipStatus.ACTIVE)
                .orElseThrow(() -> new ForbiddenException("You do not have access to this organization."));

        Organization org = membership.getOrganization();
        return new OrganizationSummaryResponse(
                org.getId(),
                org.getName(),
                org.getSlug(),
                org.getStatus(),
                membership.getRole()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrganizationSummaryResponse> listUserOrganizations(UUID userId) {
        return membershipRepository.findByUserId(userId).stream()
                .filter(m -> m.getStatus() == MembershipStatus.ACTIVE)
                .map(m -> new OrganizationSummaryResponse(
                        m.getOrganization().getId(),
                        m.getOrganization().getName(),
                        m.getOrganization().getSlug(),
                        m.getOrganization().getStatus(),
                        m.getRole()
                ))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Organization getEntity(UUID organizationId) {
        return organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + organizationId));
    }
}
