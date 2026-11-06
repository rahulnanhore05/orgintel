package io.rahulnanhore.orgintel.identity.dto;

import java.util.UUID;

public record UserSummaryResponse(
        UUID id,
        String email,
        String fullName
) {
}
