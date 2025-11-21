# Auth Service Architecture

## 1. Purpose & Responsibilities

The Auth Service is responsible for:

- User registration and login:
  - Students
  - Instructors
  - Tenant Admins
- Managing identity data (users) and roles.
- Issuing JWT tokens consumed by:
  - API Gateway
  - Booking Service
  - Marketplace Service
  - Exam Service
  - Notification Service
  - IoT Service
  - Shuttle Service

It is central to the platform’s security, multi-tenancy, and role-based access control (RBAC).

---

## 2. Domain Model

### 2.1 User

| Field         | Type      | Description                                               |
|--------------|-----------|-----------------------------------------------------------|
| `id`         | UUID/int  | Unique user identifier                                   |
| `name`       | string    | Full name                                                |
| `email`      | string    | Unique email (per tenant)                                |
| `passwordHash` | string  | Hashed password (e.g., bcrypt)                           |
| `roles`      | string[]  | Roles: `STUDENT`, `INSTRUCTOR`, `TENANT_ADMIN`           |
| `tenantId`   | string    | Faculty/vendor identifier                                |
| `status`     | enum      | `ACTIVE`, `DISABLED`                                     |
| `createdAt`  | datetime  | Registration timestamp                                   |

### 2.2 Tenant (optional explicit entity)

| Field   | Type   | Description                    |
|--------|--------|--------------------------------|
| `id`   | string | Tenant (faculty) identifier    |
| `name` | string | Human-readable tenant name     |

---

## 3. JWT Token Format

Auth issues JWT tokens with at least:

- `sub`: user ID
- `tenantId`: tenant/faculty ID
- `roles`: array of roles
- `iat`: issued-at timestamp
- `exp`: expiration timestamp

Example payload:

```json
{
  "sub": "user-123",
  "tenantId": "faculty-eng",
  "roles": ["STUDENT"],
  "iat": 1710000000,
  "exp": 1710003600
}
