package io.rahulnanhore.orgintel.identity.service;

import io.rahulnanhore.orgintel.identity.dto.*;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse refreshToken(RefreshTokenRequest request);
    void logout(LogoutRequest request);
}
