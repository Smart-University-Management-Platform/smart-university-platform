package com.smartuniversity.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate limiting filter for protecting endpoints from brute force attacks.
 * 
 * This is an in-memory rate limiter suitable for single-instance deployments.
 * For production with multiple gateway instances, use Redis-based rate limiting
 * (spring-boot-starter-data-redis-reactive + RequestRateLimiter filter).
 * 
 * Configuration:
 * - requestsPerWindow: Maximum requests allowed per time window (default: 10)
 * - windowSeconds: Time window in seconds (default: 60)
 */
@Component
public class RateLimitingGatewayFilterFactory extends AbstractGatewayFilterFactory<RateLimitingGatewayFilterFactory.Config> {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitingGatewayFilterFactory.class);
    
    // In-memory storage for rate limiting (IP -> request count and window start)
    private final Map<String, RateLimitEntry> rateLimitStore = new ConcurrentHashMap<>();

    public RateLimitingGatewayFilterFactory() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            String clientIp = getClientIp(exchange);
            
            if (isRateLimited(clientIp, config)) {
                logger.warn("Rate limit exceeded for IP: {} on path: {}", 
                        clientIp, exchange.getRequest().getPath());
                
                exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
                exchange.getResponse().getHeaders().add("Retry-After", 
                        String.valueOf(config.getWindowSeconds()));
                exchange.getResponse().getHeaders().add("X-RateLimit-Limit", 
                        String.valueOf(config.getRequestsPerWindow()));
                
                return exchange.getResponse().setComplete();
            }
            
            return chain.filter(exchange);
        };
    }

    private String getClientIp(ServerWebExchange exchange) {
        // Check X-Forwarded-For header first (for proxied requests)
        String forwardedFor = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isEmpty()) {
            // Take the first IP if there are multiple
            return forwardedFor.split(",")[0].trim();
        }
        
        // Fall back to remote address
        if (exchange.getRequest().getRemoteAddress() != null) {
            return exchange.getRequest().getRemoteAddress().getAddress().getHostAddress();
        }
        
        return "unknown";
    }

    private boolean isRateLimited(String clientIp, Config config) {
        Instant now = Instant.now();
        
        RateLimitEntry entry = rateLimitStore.compute(clientIp, (key, existing) -> {
            if (existing == null || isWindowExpired(existing, config, now)) {
                // Start a new window
                return new RateLimitEntry(now, new AtomicInteger(1));
            } else {
                // Increment counter in current window
                existing.count.incrementAndGet();
                return existing;
            }
        });
        
        // Clean up old entries periodically (simple approach)
        if (rateLimitStore.size() > 10000) {
            cleanupOldEntries(config, now);
        }
        
        return entry.count.get() > config.getRequestsPerWindow();
    }

    private boolean isWindowExpired(RateLimitEntry entry, Config config, Instant now) {
        return entry.windowStart.plusSeconds(config.getWindowSeconds()).isBefore(now);
    }

    private void cleanupOldEntries(Config config, Instant now) {
        rateLimitStore.entrySet().removeIf(entry -> 
                isWindowExpired(entry.getValue(), config, now));
    }

    public static class Config {
        private int requestsPerWindow = 10;  // Default: 10 requests
        private int windowSeconds = 60;       // Default: per minute

        public int getRequestsPerWindow() {
            return requestsPerWindow;
        }

        public void setRequestsPerWindow(int requestsPerWindow) {
            this.requestsPerWindow = requestsPerWindow;
        }

        public int getWindowSeconds() {
            return windowSeconds;
        }

        public void setWindowSeconds(int windowSeconds) {
            this.windowSeconds = windowSeconds;
        }
    }

    private static class RateLimitEntry {
        final Instant windowStart;
        final AtomicInteger count;

        RateLimitEntry(Instant windowStart, AtomicInteger count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}
