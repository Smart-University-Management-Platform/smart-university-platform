package com.smartuniversity.auth.web;

import com.smartuniversity.auth.service.AuthService;
import com.smartuniversity.auth.web.dto.AuthResponse;
import com.smartuniversity.auth.web.dto.ChangePasswordRequest;
import com.smartuniversity.auth.web.dto.LoginRequest;
import com.smartuniversity.auth.web.dto.RegisterRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST API for user registration and authentication.
 */
@RestController
@RequestMapping("/auth")
@Tag(name = "Auth", description = "User registration and authentication")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new user", description = "Creates a user, hashes the password, and returns a JWT")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user", description = "Validates credentials and returns a JWT with role and tenant")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change password", description = "Changes password for the authenticated user")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-Tenant-Id") String tenantId) {

        if (!StringUtils.hasText(userIdHeader) || !StringUtils.hasText(tenantId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UUID userId = UUID.fromString(userIdHeader);
        authService.changePassword(userId, tenantId, request.getCurrentPassword(), request.getNewPassword());
        return ResponseEntity.ok().build();
    }
}