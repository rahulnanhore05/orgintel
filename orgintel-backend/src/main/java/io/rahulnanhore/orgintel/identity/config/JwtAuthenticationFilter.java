package io.rahulnanhore.orgintel.identity.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import io.rahulnanhore.orgintel.identity.security.CustomUserDetails;
import io.rahulnanhore.orgintel.identity.security.CustomUserDetailsService;
import io.rahulnanhore.orgintel.identity.service.JwtTokenProvider;

import java.io.IOException;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider, CustomUserDetailsService userDetailsService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String token = extractBearerToken(request);

        if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
            UUID userId = jwtTokenProvider.getUserId(token);
            String email = jwtTokenProvider.getEmail(token);
            String role = jwtTokenProvider.getRole(token);

            try {
                UserDetails loadedUser = userDetailsService.loadUserByUsername(email);
                if (loadedUser.isEnabled() && loadedUser.isAccountNonLocked()) {
                    AuthenticatedUserPrincipal principal = (loadedUser instanceof CustomUserDetails cud)
                            ? new AuthenticatedUserPrincipal(cud.getUserId(), cud.getEmail(), cud.getFullName(), cud.getStatus(), role)
                            : new AuthenticatedUserPrincipal(userId, email, role);

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (Exception e) {
                logger.debug("Could not authenticate user from JWT token: " + e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractBearerToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
