package io.rahulnanhore.orgintel.identity.security;

import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import io.rahulnanhore.orgintel.identity.domain.User;
import io.rahulnanhore.orgintel.identity.domain.UserStatus;

import java.io.Serializable;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public class CustomUserDetails implements UserDetails, CredentialsContainer, Serializable {

    private final UUID userId;
    private final String email;
    private String password;
    private final String fullName;
    private final UserStatus status;
    private final String role;
    private final Collection<? extends GrantedAuthority> authorities;

    public CustomUserDetails(User user) {
        this(user, null);
    }

    public CustomUserDetails(User user, String role) {
        this.userId = user.getId();
        this.email = user.getEmail();
        this.password = user.getPasswordHash();
        this.fullName = user.getFullName();
        this.status = user.getStatus();
        this.role = role;
        this.authorities = (role != null && !role.isBlank())
                ? List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                : Collections.emptyList();
    }

    public CustomUserDetails(UUID userId, String email, String password, String fullName, UserStatus status, String role) {
        this.userId = userId;
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.status = status != null ? status : UserStatus.ACTIVE;
        this.role = role;
        this.authorities = (role != null && !role.isBlank())
                ? List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                : Collections.emptyList();
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID userId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public String email() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public String fullName() {
        return fullName;
    }

    public UserStatus getStatus() {
        return status;
    }

    public UserStatus status() {
        return status;
    }

    public String getRole() {
        return role;
    }

    public String role() {
        return role;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return status != UserStatus.SUSPENDED;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return status == UserStatus.ACTIVE;
    }

    @Override
    public void eraseCredentials() {
        this.password = null;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CustomUserDetails that = (CustomUserDetails) o;
        return Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId);
    }
}
