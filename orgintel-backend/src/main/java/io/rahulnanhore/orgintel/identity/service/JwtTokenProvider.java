package io.rahulnanhore.orgintel.identity.service;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    private final SecretKey key;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;
    private final String issuer;

    public JwtTokenProvider(
            @Value("${orgintel.security.jwt.secret}") String secret,
            @Value("${orgintel.security.jwt.access-token-expiration-ms:900000}") long accessTokenExpirationMs,
            @Value("${orgintel.security.jwt.refresh-token-expiration-ms:604800000}") long refreshTokenExpirationMs,
            @Value("${orgintel.security.jwt.issuer:orgintel-backend}") String issuer) {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
        this.issuer = issuer;
    }

    public String generateAccessToken(UUID userId, String email, UUID organizationId, String role) {
        Instant now = Instant.now();
        Instant expiry = now.plusMillis(accessTokenExpirationMs);

        JwtBuilder builder = Jwts.builder()
                .subject(userId.toString())
                .issuer(issuer)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .claim("email", email)
                .claim("role", role);

        if (organizationId != null) {
            builder.claim("orgId", organizationId.toString());
        }

        return builder.signWith(key).compact();
    }

    public String generateRawRefreshToken() {
        return UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
    }

    public Instant getRefreshTokenExpiry() {
        return Instant.now().plusMillis(refreshTokenExpirationMs);
    }

    public static String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    public UUID getUserId(String token) {
        return UUID.fromString(parseClaims(token).getSubject());
    }

    public String getEmail(String token) {
        return parseClaims(token).get("email", String.class);
    }

    public UUID getOrganizationId(String token) {
        String orgId = parseClaims(token).get("orgId", String.class);
        return orgId != null ? UUID.fromString(orgId) : null;
    }

    public String getRole(String token) {
        return parseClaims(token).get("role", String.class);
    }
}
