package io.rahulnanhore.orgintel.identity.config;

import java.io.Serializable;
import java.util.UUID;

import io.rahulnanhore.orgintel.identity.domain.User;
import io.rahulnanhore.orgintel.identity.domain.UserStatus;
import io.rahulnanhore.orgintel.identity.security.CustomUserDetails;

public class AuthenticatedUserPrincipal extends CustomUserDetails implements Serializable {

    public AuthenticatedUserPrincipal(User user) {
        super(user);
    }

    public AuthenticatedUserPrincipal(User user, String role) {
        super(user, role);
    }

    public AuthenticatedUserPrincipal(UUID userId, String email, String role) {
        super(userId, email, null, null, UserStatus.ACTIVE, role);
    }

    public AuthenticatedUserPrincipal(UUID userId, String email, String fullName, UserStatus status, String role) {
        super(userId, email, null, fullName, status, role);
    }
}
