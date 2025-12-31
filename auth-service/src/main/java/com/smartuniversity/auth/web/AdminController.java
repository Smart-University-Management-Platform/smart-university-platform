package com.smartuniversity.auth.web;

import com.smartuniversity.auth.domain.Role;
import com.smartuniversity.auth.domain.User;
import com.smartuniversity.auth.repository.UserRepository;
import com.smartuniversity.auth.web.dto.ChangeRoleRequest;
import com.smartuniversity.auth.web.dto.UserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Admin endpoints for user management.
 * These endpoints require ADMIN role (enforced at gateway level).
 */
@RestController
@RequestMapping("/auth/admin")
@Tag(name = "Admin", description = "User management for administrators")
public class AdminController {

    private final UserRepository userRepository;

    public AdminController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * List all users in the tenant.
     */
    @GetMapping("/users")
    @Operation(summary = "List all users", description = "Returns all users in the current tenant (ADMIN only)")
    public ResponseEntity<List<UserDto>> listUsers(
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId) {
        
        if (tenantId == null || tenantId.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<UserDto> users = userRepository.findAllByTenantId(tenantId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(users);
    }

    /**
     * Change a user's role.
     */
    @PutMapping("/users/{userId}/role")
    @Operation(summary = "Change user role", description = "Updates a user's role (ADMIN only)")
    public ResponseEntity<UserDto> changeUserRole(
            @PathVariable UUID userId,
            @Valid @RequestBody ChangeRoleRequest request,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        
        if (tenantId == null || tenantId.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // Ensure user belongs to the same tenant
        if (!user.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot modify users from other tenants");
        }

        // Prevent admin from demoting themselves (safety measure)
        if (currentUserId != null && userId.toString().equals(currentUserId) && request.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot change your own role");
        }

        user.setRole(request.getRole());
        User saved = userRepository.save(user);

        return ResponseEntity.ok(toDto(saved));
    }

    /**
     * Get a single user by ID.
     */
    @GetMapping("/users/{userId}")
    @Operation(summary = "Get user by ID", description = "Returns a single user's details (ADMIN only)")
    public ResponseEntity<UserDto> getUser(
            @PathVariable UUID userId,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId) {
        
        if (tenantId == null || tenantId.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // Ensure user belongs to the same tenant
        if (!user.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot view users from other tenants");
        }

        return ResponseEntity.ok(toDto(user));
    }

    private UserDto toDto(User user) {
        return new UserDto(user.getId(), user.getUsername(), user.getRole(), user.getTenantId());
    }
}
