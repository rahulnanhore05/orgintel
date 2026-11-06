package io.rahulnanhore.orgintel.organization.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.rahulnanhore.orgintel.organization.domain.OrgRole;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AddMemberRequest(
        UUID userId,

        String email,

        @NotNull(message = "Role is required")
        OrgRole role
) {
    @JsonCreator
    public AddMemberRequest(
            @JsonProperty("userId") UUID userId,
            @JsonProperty("email") String email,
            @JsonProperty("role") OrgRole role
    ) {
        this.userId = userId;
        this.email = email != null ? email.trim() : null;
        this.role = role;
    }

    public AddMemberRequest(UUID userId, OrgRole role) {
        this(userId, null, role);
    }

    public AddMemberRequest(String email, OrgRole role) {
        this(null, email, role);
    }
}
