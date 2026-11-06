package io.rahulnanhore.orgintel.identity.service;

import io.rahulnanhore.orgintel.common.exception.ConflictException;
import io.rahulnanhore.orgintel.common.exception.UnauthorizedException;
import io.rahulnanhore.orgintel.identity.dto.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthServiceIntegrationTest {

    @Autowired
    private AuthService authService;

    @Test
    void shouldRegisterAndLoginSuccessfully() {
        RegisterRequest registerReq = new RegisterRequest(
                "alice@example.com",
                "StrongP@ssw0rd123",
                "Alice Engineer"
        );

        AuthResponse registerResp = authService.register(registerReq);
        assertNotNull(registerResp);
        assertNotNull(registerResp.accessToken());
        assertNotNull(registerResp.refreshToken());
        assertEquals("alice@example.com", registerResp.user().email());

        // Login with correct credentials
        LoginRequest loginReq = new LoginRequest("alice@example.com", "StrongP@ssw0rd123", null);
        AuthResponse loginResp = authService.login(loginReq);
        assertNotNull(loginResp.accessToken());
        assertNotNull(loginResp.refreshToken());
    }

    @Test
    void shouldRejectDuplicateEmailRegistration() {
        RegisterRequest req1 = new RegisterRequest("bob@example.com", "P@ssword123", "Bob Developer");
        authService.register(req1);

        RegisterRequest req2 = new RegisterRequest("BOB@EXAMPLE.COM", "AnotherPass123", "Bob Duplicate");
        assertThrows(ConflictException.class, () -> authService.register(req2));
    }

    @Test
    void shouldRejectInvalidPassword() {
        RegisterRequest req = new RegisterRequest("charlie@example.com", "CorrectPass123", "Charlie Brown");
        authService.register(req);

        LoginRequest wrongLogin = new LoginRequest("charlie@example.com", "WrongPassword", null);
        assertThrows(BadCredentialsException.class, () -> authService.login(wrongLogin));
    }

    @Test
    void shouldRotateRefreshTokenSuccessfully() {
        RegisterRequest req = new RegisterRequest("david@example.com", "StrongPass123", "David Miller");
        AuthResponse initialAuth = authService.register(req);

        String initialRefreshToken = initialAuth.refreshToken();

        // Rotate token
        RefreshTokenRequest refreshReq = new RefreshTokenRequest(initialRefreshToken);
        AuthResponse rotatedAuth = authService.refreshToken(refreshReq);

        assertNotNull(rotatedAuth.accessToken());
        assertNotNull(rotatedAuth.refreshToken());
        assertNotEquals(initialRefreshToken, rotatedAuth.refreshToken());

        // Attempting to reuse old refresh token must be rejected
        assertThrows(UnauthorizedException.class, () -> authService.refreshToken(refreshReq));
    }

    @Test
    void shouldRevokeRefreshTokenOnLogout() {
        RegisterRequest req = new RegisterRequest("eve@example.com", "StrongPass123", "Eve Security");
        AuthResponse auth = authService.register(req);

        LogoutRequest logoutReq = new LogoutRequest(auth.refreshToken());
        authService.logout(logoutReq);

        // Subsequent refresh must fail
        RefreshTokenRequest refreshReq = new RefreshTokenRequest(auth.refreshToken());
        assertThrows(UnauthorizedException.class, () -> authService.refreshToken(refreshReq));
    }
}
