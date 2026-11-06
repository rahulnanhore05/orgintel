package io.rahulnanhore.orgintel.identity.security;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.rahulnanhore.orgintel.common.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Component
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException accessDeniedException) throws IOException {

        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);

        ErrorResponse errorResponse = ErrorResponse.of(
                UUID.randomUUID().toString(),
                "ACCESS_DENIED",
                "Access is denied. You do not have permission for this resource.",
                HttpServletResponse.SC_FORBIDDEN,
                request.getRequestURI()
        );

        response.getOutputStream().println(objectMapper.writeValueAsString(errorResponse));
    }
}
