# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

## Security Best Practices for Deployment

### 1. Change Default Credentials

**CRITICAL**: Before deploying to any environment other than local development, you MUST change all default credentials:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and set secure values for:
# - JWT_SECRET (use: openssl rand -base64 32)
# - DB_PASSWORD
# - REDIS_PASSWORD
# - RABBITMQ_PASSWORD
```

### 2. JWT Secret

The default JWT secret in the codebase is **PUBLIC** and known to anyone who reads the source code. Generate a new one:

```bash
openssl rand -base64 32
```

Set this value in both:
- `JWT_SECRET` environment variable for `auth-service`
- `JWT_SECRET` environment variable for `gateway-service`

### 3. Database Passwords

Each database should have a unique, strong password in production:
- `auth-db`
- `booking-db`
- `market-db`
- `payment-db`
- `exam-db`
- `notification-db`
- `dashboard-db`

### 4. Redis Password

Redis is configured to require authentication. Change the default password:
```
REDIS_PASSWORD=your-secure-redis-password
```

### 5. RabbitMQ Credentials

Change the default RabbitMQ credentials:
```
RABBITMQ_USER=your-admin-user
RABBITMQ_PASSWORD=your-secure-password
```

### 6. HTTPS in Production

This development setup uses HTTP. In production:
- Deploy behind a reverse proxy (nginx, Traefik)
- Enable TLS/SSL certificates
- Update `VITE_API_BASE_URL` to use `https://`

### 7. Rate Limiting

The API Gateway includes rate limiting for authentication endpoints:
- Login: 10 requests per minute
- Register: 5 requests per minute

Consider adding additional rate limiting for production.

### 8. Account Lockout

Failed login attempts trigger account lockout:
- 5 failed attempts = 15 minute lockout

## Demo Accounts

The following demo accounts are created for development/testing purposes:

| Username | Password | Role |
|----------|----------|------|
| admin | Admin123! | ADMIN |
| teacher | Teacher123! | TEACHER |
| student | Student123! | STUDENT |

**These should be disabled or have passwords changed in production.**

## Security Features Implemented

- ✅ JWT Authentication with role-based access control
- ✅ Password hashing with BCrypt
- ✅ Strong password validation (8+ chars, uppercase, lowercase, digit, special char)
- ✅ Account lockout after failed attempts
- ✅ Rate limiting on authentication endpoints
- ✅ XSS protection via input sanitization
- ✅ Multi-tenant data isolation
- ✅ Pessimistic locking to prevent race conditions
