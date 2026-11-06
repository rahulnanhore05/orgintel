package io.rahulnanhore.orgintel.organization.dto;

import io.rahulnanhore.orgintel.organization.domain.Membership;
import io.rahulnanhore.orgintel.organization.domain.MembershipStatus;
import io.rahulnanhore.orgintel.organization.domain.OrgRole;

import java.time.Instant;
import java.util.UUID;

public record MemberResponse(
        UUID membershipId,
        UUID userId,
        String email,
        String fullName,
        OrgRole role,
        MembershipStatus status,
        Instant joinedAt
) {
    public static MemberResponse from(Membership membership) {
        return new MemberResponse(
                membership.getId(),
                membership.getUser().getId(),
                membership.getUser().getEmail(),
                membership.getUser().getFullName(),
                membership.getRole(),
                membership.getStatus(),
                membership.getCreatedAt()
        );
    }
}
