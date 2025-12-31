-- V1__create_users_table.sql
-- Initial schema for auth-service

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    lockout_until TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT uk_users_username_tenant UNIQUE (username, tenant_id),
    CONSTRAINT chk_users_role CHECK (role IN ('STUDENT', 'TEACHER', 'ADMIN'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Comments
COMMENT ON TABLE users IS 'User accounts for authentication';
COMMENT ON COLUMN users.failed_login_attempts IS 'Counter for failed login attempts (account lockout)';
COMMENT ON COLUMN users.lockout_until IS 'Timestamp until which the account is locked';
