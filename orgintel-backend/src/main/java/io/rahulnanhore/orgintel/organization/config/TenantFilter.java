package io.rahulnanhore.orgintel.organization.config;

import io.rahulnanhore.orgintel.identity.config.AuthenticatedUserPrincipal;
import io.rahulnanhore.orgintel.organization.service.MembershipService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Lazy;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
public class TenantFilter extends OncePerRequestFilter {

    public static final String ORG_HEADER = "X-Organization-Id";
    private final MembershipService membershipService;

    public TenantFilter(@Lazy MembershipService membershipService) {
        this.membershipService = membershipService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.startsWith("/api/v1/auth/") ||
                path.startsWith("/actuator/") ||
                path.startsWith("/v3/api-docs") ||
                path.startsWith("/swagger-ui") ||
                path.equals("/swagger-ui.html")) {
            return true;
        }
        // Listing or creating user organizations does not require existing tenant header check
        if ((path.equals("/api/v1/organizations") || path.equals("/api/v1/organizations/")) &&
                (request.getMethod().equalsIgnoreCase("GET") || request.getMethod().equalsIgnoreCase("POST"))) {
            return true;
        }
        return false;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        try {
            String orgHeader = request.getHeader(ORG_HEADER);
            if (StringUtils.hasText(orgHeader)) {
                try {
                    UUID orgId = UUID.fromString(orgHeader.trim());
                    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                    if (auth != null && auth.getPrincipal() instanceof AuthenticatedUserPrincipal principal) {
                        // Validate user belongs to this organization
                        if (!membershipService.hasActiveMembership(principal.userId(), orgId)) {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\": \"FORBIDDEN\", \"message\": \"You do not belong to the requested organization.\"}");
                            return;
                        }
                    }
                } catch (IllegalArgumentException e) {
                    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\": \"BAD_REQUEST\", \"message\": \"Invalid X-Organization-Id header format. Must be a valid UUID.\"}");
                    return;
                }
            }

            filterChain.doFilter(request, response);
        } catch (RuntimeException e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"BAD_REQUEST\", \"message\": \"Missing X-Organization-Id header. Must be a valid UUID.\"}");
            filterChain.doFilter(request, response);
        }
    }
}
