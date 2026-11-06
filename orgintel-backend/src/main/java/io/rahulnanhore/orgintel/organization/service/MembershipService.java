package io.rahulnanhore.orgintel.organization.service;

import io.rahulnanhore.orgintel.organization.domain.Membership;
import io.rahulnanhore.orgintel.organization.dto.AddMemberRequest;
import io.rahulnanhore.orgintel.organization.dto.MemberResponse;
import io.rahulnanhore.orgintel.organization.domain.OrgRole;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MembershipService {
    boolean hasActiveMembership(UUID userId, UUID organizationId);
    Optional<OrgRole> getUserRole(UUID userId, UUID organizationId);
    Membership addMember(UUID organizationId, UUID userId, OrgRole role, UUID requestingUserId);
    Membership addMember(UUID organizationId, AddMemberRequest request, UUID requestingUserId);
    void updateRole(UUID organizationId, UUID targetUserId, OrgRole newRole, UUID requestingUserId);
    void removeMember(UUID organizationId, UUID targetUserId, UUID requestingUserId);
    Page<MemberResponse> listMembers(UUID organizationId, Pageable pageable);
    List<Membership> getUserMemberships(UUID userId);
}
