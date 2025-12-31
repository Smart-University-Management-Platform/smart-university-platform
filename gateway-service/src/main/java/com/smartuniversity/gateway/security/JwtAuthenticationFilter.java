package com.smartuniversity.gateway.security;

import com.smartuniversity.common.security.RoleConstants;
import io.jsonwebtoken.JwtException;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import reactor.core.publisher.Mono;

/**
 * Global filter that validates JWT tokens on all non-/auth routes and injects
 * user identity and role headers into downstream requests.
 */
@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        // Allow unauthenticated access to public auth endpoints and health checks only
        // SECURITY: Admin endpoints (/auth/admin/*) require authentication and ADMIN role
        if (isPublicAuthEndpoint(path) || isPublicActuatorEndpoint(path)) {
            return chain.filter(exchange);
        }

        // Allow CORS preflight without authentication
        if (request.getMethod() == HttpMethod.OPTIONS) {
            return chain.filter(exchange);
        }

        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String token = authHeader.substring(7);
        JwtUserDetails userDetails;
        try {
            userDetails = jwtService.parseToken(token);
        } catch (JwtException ex) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        if (!isAuthorized(userDetails, path, request.getMethod())) {
            exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
            return exchange.getResponse().setComplete();
        }

        ServerHttpRequest mutatedRequest = request.mutate()
                .header("X-User-Id", userDetails.getUserId())
                .header("X-User-Role", userDetails.getRole())
                .header("X-Tenant-Id", userDetails.getTenantId())
                .build();

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    /**
     * Checks if the path is a public auth endpoint (no authentication required).
     * Admin endpoints require authentication.
     */
    private boolean isPublicAuthEndpoint(String path) {
        // /auth/admin/* endpoints require authentication
        if (path.startsWith("/auth/admin")) {
            return false;
        }
        // Other auth endpoints (login, register) are public
        return path.startsWith("/auth/");
    }

    /**
     * Checks if the path is a public actuator endpoint.
     * Only health and info endpoints are allowed without authentication.
     * All other actuator endpoints (env, configprops, beans, heapdump, etc.)
     * require authentication for security.
     */
    private boolean isPublicActuatorEndpoint(String path) {
        // Allow only health endpoints (gateway's own and proxied service health checks)
        if (path.equals("/actuator/health") || path.startsWith("/actuator/health/")) {
            return true;
        }
        // Allow proxied service health checks (e.g., /auth/actuator/health)
        if (path.contains("/actuator/health")) {
            return true;
        }
        // Allow info endpoint (typically safe to expose)
        if (path.equals("/actuator/info")) {
            return true;
        }
        return false;
    }

    private boolean isAuthorized(JwtUserDetails user, String path, HttpMethod method) {
        String role = user.getRole();
        if (role == null) {
            return false;
        }

        // Basic RBAC checks for sensitive routes.
        boolean isTeacherOrAdmin = RoleConstants.isPrivilegedRole(role);
        boolean isAdmin = RoleConstants.isAdmin(role);

        // SECURITY: Sensitive actuator endpoints require ADMIN role
        if (path.startsWith("/actuator/") && !isPublicActuatorEndpoint(path)) {
            return isAdmin;
        }

        // SECURITY: Admin endpoints require ADMIN role
        if (path.startsWith("/auth/admin")) {
            return isAdmin;
        }

        if (path.startsWith("/market/products") && HttpMethod.POST.equals(method)) {
            return isTeacherOrAdmin;
        }

        if (path.startsWith("/booking/resources") && HttpMethod.POST.equals(method)) {
            return isTeacherOrAdmin;
        }

        if (path.startsWith("/exam/exams") && HttpMethod.POST.equals(method)) {
            // Exam submission is allowed for students - they POST to /exam/exams/{id}/submit
            // Only exam creation (POST /exam/exams) and start/close need teacher/admin
            if (path.matches("/exam/exams/[^/]+/submit")) {
                // Students can submit exams - let the exam service handle role validation
                return true;
            }
            // Exam creation and start/close should be limited to teachers/admins.
            return isTeacherOrAdmin;
        }

        // By default any authenticated user is allowed.
        return true;
    }

    @Override
    public int getOrder() {
        // Ensure this filter runs early in the chain.
        return Ordered.HIGHEST_PRECEDENCE;
    }
}