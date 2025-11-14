# ADR-0002: Multi-Tenancy Strategy

Status: Proposed  
Date: 2025-11-XX  
Decision Drivers: data isolation, operational complexity, expected number of tenants

## Context

The platform is intended to serve multiple **faculties or vendors** (tenants) on the same deployment. Requirements:

- Prevent data leakage between tenants (strict isolation).
- Support tens to potentially hundreds of tenants.
- Allow different load characteristics per tenant (some may grow larger than others).
- Keep operational complexity manageable for a student project.

We need a **multi-tenancy strategy** for our databases and data access.

## Options

1. **Tenant-per-Database**

   - Each tenant gets its own physical database for each service.
   - Pros:
     - Strong isolation; easy to move a heavy tenant to its own infrastructure.
     - Per-tenant backups and maintenance.
   - Cons:
     - Many databases to manage (migrations, connections).
     - Harder to manage in a teaching/demo environment.

2. **Tenant-per-Schema (Chosen)**

   - Shared database instance per service, with one schema per tenant.
   - Pros:
     - Good isolation (separate schemas).
     - Fewer database instances; easier to manage connections.
     - Allows moving specific tenants to a dedicated DB in the future if needed.
   - Cons:
     - Schema management tooling must support migrations for multiple schemas.
     - Still more complex than a single shared schema.

3. **Shared Tables with Row-Level Security**

   - Single schema with shared tables and a `tenant_id` column.
   - Pros:
     - Simplest from an infrastructure point of view (one DB, one schema).
     - Easy to query across multiple tenants (if ever needed).
   - Cons:
     - Highest risk if `tenant_id` checks are implemented incorrectly.
     - Harder to “move out” a single tenant into its own DB later.

## Decision

For Phase 1–2, we adopt **Tenant-per-Schema** as the primary strategy:

- Each service has a single database instance.
- Each tenant is mapped to a **separate schema** within that DB.
- Application code sets the schema / search path based on the `tenantId` extracted from the JWT (via the API Gateway).
- Migrations are applied per schema using tooling (e.g., running migrations once per tenant).

We keep the door open to:

- migrate heavy tenants to **Tenant-per-Database** in future iterations, using the same data model.

## Consequences

### Positive

- **Isolation**: tenant data is separated at the schema level; easier to reason about than purely row-level isolation.
- **Manageable operations**: fewer DB instances than tenant-per-database, but better isolation than a fully shared schema.
- **Flexibility**: we can move a large tenant to its own DB later with a migration script.

### Negative

- **Migration complexity**: schema migrations must run for each tenant schema.
- **Tooling overhead**: our tooling (migrations scripts, DevOps) must be aware of multiple schemas.
- **Testing**: we must test for tenant leakage and correct schema selection.

### Implementation Notes

- The API Gateway forwards tenant identity using JWT (`tenantId` claim) and possibly a header such as `X-Tenant-ID`.
- Each service:
  - extracts `tenantId` from the authenticated context,
  - configures the DB session to use the appropriate schema for queries.
- Integration tests will include:
  - creating data for tenant A and verifying it’s not visible to tenant B,
  - access control checks based on `tenantId`.

### Status and Next Steps

- Status: **Proposed** for Phase 1; detailed schema and migration strategy will be refined in Phase 2.
- Later, we may:
  - introduce tools for per-tenant provisioning,
  - define thresholds where a tenant should be moved to a dedicated database.
