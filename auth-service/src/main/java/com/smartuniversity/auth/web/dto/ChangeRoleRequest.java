package com.smartuniversity.auth.web.dto;

import com.smartuniversity.auth.domain.Role;
import jakarta.validation.constraints.NotNull;

/**
 * Request to change a user's role.
 */
public class ChangeRoleRequest {
    
    @NotNull(message = "Role is required")
    private Role role;

    public ChangeRoleRequest() {}

    public ChangeRoleRequest(Role role) {
        this.role = role;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}
