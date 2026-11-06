package io.rahulnanhore.orgintel.identity.service.impl;

import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.rahulnanhore.orgintel.common.exception.ConflictException;
import io.rahulnanhore.orgintel.common.exception.ForbiddenException;
import io.rahulnanhore.orgintel.common.exception.UnauthorizedException;
import io.rahulnanhore.orgintel.identity.domain.RefreshToken;
import io.rahulnanhore.orgintel.identity.domain.User;
import io.rahulnanhore.orgintel.identity.domain.UserStatus;
import io.rahulnanhore.orgintel.identity.dto.*;
import io.rahulnanhore.orgintel.identity.repository.RefreshTokenRepository;
import io.rahulnanhore.orgintel.identity.repository.UserRepository;
import io.rahulnanhore.orgintel.identity.security.CustomUserDetails;
import io.rahulnanhore.orgintel.identity.service.AuthService;
import io.rahulnanhore.orgintel.identity.service.JwtTokenProvider;
import io.rahulnanhore.orgintel.organization.domain.Membership;
import io.rahulnanhore.orgintel.organization.domain.MembershipStatus;
import io.rahulnanhore.orgintel.organization.domain.OrgRole;
import io.rahulnanhore.orgintel.organization.domain.Organization;
import io.rahulnanhore.orgintel.organization.dto.OrganizationSummaryResponse;
import io.rahulnanhore.orgintel.organization.repository.MembershipRepository;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final MembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    public AuthServiceImpl(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            MembershipRepository membershipRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.membershipRepository = membershipRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.authenticationManager = authenticationManager;
    }

    @Override
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.email().toLowerCase().trim();

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ConflictException("User with email '" + normalizedEmail + "' already exists.");
        }

        User user = new User(
                UUID.randomUUID(),
                normalizedEmail,
                passwordEncoder.encode(request.password()),
                request.fullName().trim(),
                UserStatus.ACTIVE
        );
        user = userRepository.save(user);

        return generateAuthResponse(user, null, null);
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.email().toLowerCase().trim();

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalizedEmail, request.password())
            );
        } catch (DisabledException ex) {
            throw new UnauthorizedException("Your account is disabled. Please contact support.");
        } catch (LockedException ex) {
            throw new UnauthorizedException("Your account is locked. Please contact support.");
        } catch (BadCredentialsException | InternalAuthenticationServiceException ex) {
            throw new BadCredentialsException("Invalid email or password.");
        }

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userRepository.findById(userDetails.getUserId())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password."));

        Organization targetOrg = null;
        OrgRole userRole = null;

        List<Membership> memberships = membershipRepository.findByUserId(user.getId());
        if (request.organizationId() != null) {
            Membership membership = memberships.stream()
                    .filter(m -> m.getOrganization().getId().equals(request.organizationId())
                            && m.getStatus() == MembershipStatus.ACTIVE)
                    .findFirst()
                    .orElseThrow(() -> new ForbiddenException("You are not an active member of the requested organization."));
            targetOrg = membership.getOrganization();
            userRole = membership.getRole();
        } else if (!memberships.isEmpty()) {
            Membership activeMembership = memberships.stream()
                    .filter(m -> m.getStatus() == MembershipStatus.ACTIVE)
                    .findFirst()
                    .orElse(null);
            if (activeMembership != null) {
                targetOrg = activeMembership.getOrganization();
                userRole = activeMembership.getRole();
            }
        }

        return generateAuthResponse(user, targetOrg, userRole);
    }

    @Override
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String tokenHash = JwtTokenProvider.hashToken(request.refreshToken());

        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token."));

        if (!refreshToken.isActive()) {
            throw new UnauthorizedException("Refresh token is expired or revoked. Please log in again.");
        }

        User user = refreshToken.getUser();
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("User account is inactive.");
        }

        // Rotate: revoke the old token
        refreshToken.revoke();
        refreshTokenRepository.save(refreshToken);

        // Retain current organization context if active
        List<Membership> memberships = membershipRepository.findByUserId(user.getId());
        Organization activeOrg = null;
        OrgRole activeRole = null;
        if (!memberships.isEmpty()) {
            Membership activeMembership = memberships.stream()
                    .filter(m -> m.getStatus() == MembershipStatus.ACTIVE)
                    .findFirst()
                    .orElse(null);
            if (activeMembership != null) {
                activeOrg = activeMembership.getOrganization();
                activeRole = activeMembership.getRole();
            }
        }

        return generateAuthResponse(user, activeOrg, activeRole);
    }

    @Override
    public void logout(LogoutRequest request) {
        String tokenHash = JwtTokenProvider.hashToken(request.refreshToken());
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            token.revoke();
            refreshTokenRepository.save(token);
        });
    }

    private AuthResponse generateAuthResponse(User user, Organization organization, OrgRole role) {
        UUID orgId = organization != null ? organization.getId() : null;
        String roleStr = role != null ? role.name() : null;

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), orgId, roleStr);
        String rawRefreshToken = jwtTokenProvider.generateRawRefreshToken();
        String hashedRefreshToken = JwtTokenProvider.hashToken(rawRefreshToken);

        RefreshToken refreshToken = new RefreshToken(
                UUID.randomUUID(),
                user,
                hashedRefreshToken,
                jwtTokenProvider.getRefreshTokenExpiry()
        );
        refreshTokenRepository.save(refreshToken);

        UserSummaryResponse userSummary = new UserSummaryResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName()
        );

        OrganizationSummaryResponse orgSummary = organization != null ? new OrganizationSummaryResponse(
                organization.getId(),
                organization.getName(),
                organization.getSlug(),
                organization.getStatus(),
                role
        ) : null;

        return AuthResponse.of(
                accessToken,
                rawRefreshToken,
                900, // 15 minutes in seconds
                userSummary,
                orgSummary
        );
    }
}
