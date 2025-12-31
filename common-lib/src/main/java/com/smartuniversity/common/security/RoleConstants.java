package com.smartuniversity.common.security;

/**
 * System-wide role constants for RBAC (Role-Based Access Control).
 * 
 * Use these constants instead of hardcoded strings to ensure consistency
 * and make refactoring easier.
 * 
 * Example usage:
 * <pre>
 * import static com.smartuniversity.common.security.RoleConstants.*;
 * 
 * if (ROLE_ADMIN.equals(role) || ROLE_TEACHER.equals(role)) {
 *     // Allow admin or teacher access
 * }
 * </pre>
 */
public final class RoleConstants {
    
    private RoleConstants() {
        // Utility class - prevent instantiation
    }
    
    /**
     * Student role - can browse, book resources, submit exams, purchase products.
     */
    public static final String ROLE_STUDENT = "STUDENT";
    
    /**
     * Teacher role - can create resources, exams, and products in addition to student capabilities.
     */
    public static final String ROLE_TEACHER = "TEACHER";
    
    /**
     * Admin role - full access to all operations including sensitive actuator endpoints.
     */
    public static final String ROLE_ADMIN = "ADMIN";
    
    /**
     * Check if a role is a privileged role (teacher or admin).
     * 
     * @param role the role to check
     * @return true if the role is TEACHER or ADMIN
     */
    public static boolean isPrivilegedRole(String role) {
        return ROLE_TEACHER.equals(role) || ROLE_ADMIN.equals(role);
    }
    
    /**
     * Check if a role is an admin role.
     * 
     * @param role the role to check
     * @return true if the role is ADMIN
     */
    public static boolean isAdmin(String role) {
        return ROLE_ADMIN.equals(role);
    }
}
