package com.smartuniversity.auth.web.dto;

import com.smartuniversity.auth.domain.Role;
import java.util.UUID;

/**
 * DTO for user information (excludes sensitive data like password hash).
 */
public class UserDto {
    private UUID id;
    private String username;
    private Role role;
    private String tenantId;

    public UserDto() {}

    public UserDto(UUID id, String username, Role role, String tenantId) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.tenantId = tenantId;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }
}
