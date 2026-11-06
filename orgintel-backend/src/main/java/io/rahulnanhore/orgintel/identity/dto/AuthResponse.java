package io.rahulnanhore.orgintel.identity.dto;

import io.rahulnanhore.orgintel.organization.dto.OrganizationSummaryResponse;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresInSeconds,
        UserSummaryResponse user,
        OrganizationSummaryResponse activeOrganization
) {
    public static AuthResponse of(
            String accessToken,
            String refreshToken,
            long expiresInSeconds,
            UserSummaryResponse user,
            OrganizationSummaryResponse activeOrganization) {
        return new AuthResponse(accessToken, refreshToken, "Bearer", expiresInSeconds, user, activeOrganization);
    }
}
