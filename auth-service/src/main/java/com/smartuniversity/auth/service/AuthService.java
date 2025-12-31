package com.smartuniversity.auth.service;

import com.smartuniversity.auth.domain.Role;
import com.smartuniversity.auth.domain.User;
import com.smartuniversity.auth.repository.UserRepository;
import com.smartuniversity.auth.web.dto.AuthResponse;
import com.smartuniversity.auth.web.dto.LoginRequest;
import com.smartuniversity.auth.web.dto.RegisterRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    /**
     * Maximum failed login attempts before account lockout.
     * Configure via ACCOUNT_LOCKOUT_MAX_ATTEMPTS or in application.yml.
     */
    @Value("${security.account-lockout.max-attempts:5}")
    private int maxFailedAttempts;

    /**
     * Account lockout duration in minutes.
     * Configure via ACCOUNT_LOCKOUT_DURATION_MINUTES or in application.yml.
     */
    @Value("${security.account-lockout.duration-minutes:15}")
    private int lockoutDurationMinutes;

    public AuthService(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        boolean exists = userRepository.existsByUsernameAndTenantId(
                request.getUsername(), request.getTenantId());
        if (exists) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists in this tenant");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        // SECURITY FIX: Always assign STUDENT role on registration
        // Admin/Teacher roles must be granted by an administrator
        user.setRole(Role.STUDENT);
        user.setTenantId(request.getTenantId());

        User saved = userRepository.save(user);
        String token = jwtService.generateToken(saved);
        return new AuthResponse(token);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository
                .findByUsernameAndTenantId(request.getUsername(), request.getTenantId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        // Check if account is locked
        if (user.isLocked()) {
            logger.warn("Login attempt for locked account: {} (tenant: {})",
                    request.getUsername(), request.getTenantId());
            throw new ResponseStatusException(HttpStatus.LOCKED,
                    "Account is locked due to too many failed login attempts. Try again later.");
        }

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            handleFailedLoginAttempt(user);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        // Successful login - reset failed attempts
        if (user.getFailedLoginAttempts() > 0) {
            user.resetFailedAttempts();
            userRepository.save(user);
            logger.info("Reset failed login attempts for user: {} (tenant: {})",
                    user.getUsername(), user.getTenantId());
        }

        String token = jwtService.generateToken(user);
        return new AuthResponse(token);
    }

    /**
     * Handle a failed login attempt by incrementing the counter and
     * potentially locking the account.
     */
    private void handleFailedLoginAttempt(User user) {
        user.incrementFailedAttempts();

        if (user.getFailedLoginAttempts() >= maxFailedAttempts) {
            user.lockAccount(Duration.ofMinutes(lockoutDurationMinutes));
            userRepository.save(user);
            logger.warn("Account locked after {} failed attempts: {} (tenant: {})",
                    maxFailedAttempts, user.getUsername(), user.getTenantId());
        } else {
            userRepository.save(user);
            logger.warn("Failed login attempt {} of {} for user: {} (tenant: {})",
                    user.getFailedLoginAttempts(), maxFailedAttempts,
                    user.getUsername(), user.getTenantId());
        }
    }

    /**
     * Change password for a user.
     * Validates the current password before allowing the change.
     */
    @Transactional
    public void changePassword(UUID userId, String tenantId, String currentPassword, String newPassword) {
        User user = userRepository.findByIdAndTenantId(userId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // Verify current password
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }

        // Update password
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        logger.info("Password changed for user: {} (tenant: {})", user.getUsername(), tenantId);
    }
}
