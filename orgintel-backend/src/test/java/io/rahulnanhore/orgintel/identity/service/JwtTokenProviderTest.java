package io.rahulnanhore.orgintel.identity.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    // 256-bit base64-encoded secret for testing
    private static final String SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(SECRET, 900000, 604800000, "orgintel-test");
    }

    @Test
    void shouldGenerateAndValidateAccessToken() {
        UUID userId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        String email = "test@example.com";
        String role = "ORG_ADMIN";

        String token = jwtTokenProvider.generateAccessToken(userId, email, orgId, role);

        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals(userId, jwtTokenProvider.getUserId(token));
        assertEquals(email, jwtTokenProvider.getEmail(token));
        assertEquals(orgId, jwtTokenProvider.getOrganizationId(token));
        assertEquals(role, jwtTokenProvider.getRole(token));
    }

    @Test
    void shouldRejectInvalidToken() {
        assertFalse(jwtTokenProvider.validateToken("invalid.token.string"));
    }

    @Test
    void shouldHashRefreshTokenDeterministically() {
        String rawToken = jwtTokenProvider.generateRawRefreshToken();
        String hash1 = JwtTokenProvider.hashToken(rawToken);
        String hash2 = JwtTokenProvider.hashToken(rawToken);

        assertNotNull(hash1);
        assertEquals(hash1, hash2);
        assertEquals(64, hash1.length()); // SHA-256 hex string length is 64
    }
}
