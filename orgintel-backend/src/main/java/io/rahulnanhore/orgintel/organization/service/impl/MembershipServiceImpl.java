package io.rahulnanhore.orgintel.organization.service.impl;

import io.rahulnanhore.orgintel.common.exception.ConflictException;
import io.rahulnanhore.orgintel.common.exception.ForbiddenException;
import io.rahulnanhore.orgintel.common.exception.ResourceNotFoundException;
import io.rahulnanhore.orgintel.common.exception.ValidationException;
import io.rahulnanhore.orgintel.identity.domain.User;
import io.rahulnanhore.orgintel.identity.repository.UserRepository;
import io.rahulnanhore.orgintel.organization.domain.Membership;
import io.rahulnanhore.orgintel.organization.domain.MembershipStatus;
import io.rahulnanhore.orgintel.organization.dto.AddMemberRequest;
import io.rahulnanhore.orgintel.organization.dto.MemberResponse;
import io.rahulnanhore.orgintel.organization.repository.MembershipRepository;
import io.rahulnanhore.orgintel.organization.repository.OrganizationRepository;
import io.rahulnanhore.orgintel.organization.service.MembershipService;
import io.rahulnanhore.orgintel.organization.domain.OrgRole;
import io.rahulnanhore.orgintel.organization.domain.Organization;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class MembershipServiceImpl implements MembershipService {

    private final MembershipRepository membershipRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;

    public MembershipServiceImpl(
            MembershipRepository membershipRepository,
            OrganizationRepository organizationRepository,
            UserRepository userRepository) {
        this.membershipRepository = membershipRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasActiveMembership(UUID userId, UUID organizationId) {
        return membershipRepository.findByUserIdAndOrganizationId(userId, organizationId)
                .map(m -> m.getStatus() == MembershipStatus.ACTIVE)
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OrgRole> getUserRole(UUID userId, UUID organizationId) {
        return membershipRepository.findActiveRoleByUserIdAndOrgId(userId, organizationId);
    }

    @Override
    public Membership addMember(UUID organizationId, UUID userId, OrgRole role, UUID requestingUserId) {
        requireAdmin(organizationId, requestingUserId);

        if (membershipRepository.existsByUserIdAndOrganizationId(userId, organizationId)) {
            throw new ConflictException("User is already a member of this organization.");
        }

        Organization org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Membership membership = new Membership(UUID.randomUUID(), user, org, role);
        return membershipRepository.save(membership);
    }

    @Override
    public Membership addMember(UUID organizationId, AddMemberRequest request, UUID requestingUserId) {
        if (request == null) {
            throw new ValidationException("Request body is required.");
        }

        UUID targetUserId = request.userId();
        if (targetUserId == null && request.email() != null && !request.email().isBlank()) {
            User user = userRepository.findByEmailIgnoreCase(request.email().trim())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + request.email().trim()));
            targetUserId = user.getId();
        }

        if (targetUserId == null) {
            throw new ValidationException("Either user email or userId must be provided to add a member.");
        }

        return addMember(organizationId, targetUserId, request.role(), requestingUserId);
    }

    @Override
    public void updateRole(UUID organizationId, UUID targetUserId, OrgRole newRole, UUID requestingUserId) {
        requireAdmin(organizationId, requestingUserId);

        Membership target = membershipRepository.findByUserIdAndOrganizationId(targetUserId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership not found for target user in this organization"));

        target.setRole(newRole);
        membershipRepository.save(target);
    }

    @Override
    public void removeMember(UUID organizationId, UUID targetUserId, UUID requestingUserId) {
        requireAdmin(organizationId, requestingUserId);

        Membership target = membershipRepository.findByUserIdAndOrganizationId(targetUserId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership not found for target user in this organization"));

        membershipRepository.delete(target);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<MemberResponse> listMembers(UUID organizationId, Pageable pageable) {
        return membershipRepository.findByOrganizationId(organizationId, pageable)
                .map(MemberResponse::from);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Membership> getUserMemberships(UUID userId) {
        return membershipRepository.findByUserId(userId);
    }

    private void requireAdmin(UUID organizationId, UUID userId) {
        OrgRole role = getUserRole(userId, organizationId)
                .orElseThrow(() -> new ForbiddenException("You are not a member of this organization."));
        if (role != OrgRole.ORG_ADMIN) {
            throw new ForbiddenException("Only organization administrators (ORG_ADMIN) can perform this action.");
        }
    }
}
