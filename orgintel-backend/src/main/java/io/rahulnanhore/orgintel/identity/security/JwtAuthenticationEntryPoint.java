package io.rahulnanhore.orgintel.identity.security;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.rahulnanhore.orgintel.common.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException) throws IOException {

        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        ErrorResponse errorResponse = ErrorResponse.of(
                UUID.randomUUID().toString(),
                "UNAUTHORIZED",
                "Full authentication is required to access this resource: " + authException.getMessage(),
                HttpServletResponse.SC_UNAUTHORIZED,
                request.getRequestURI()
        );

        response.getOutputStream().println(objectMapper.writeValueAsString(errorResponse));
    }
}
