# ADR-0005: Anti-Overbooking and Consistency

Status: Proposed  
Date: 2025-11-XX  
Decision Drivers: data correctness, user experience, high load behavior

## Context

The **Booking Service** is responsible for managing reservations of shared resources (rooms, labs, etc.). A key requirement is:

- **No overbooking**: two users must not be able to reserve the same resource for the same time slot.

Challenges:

- The system is distributed and may run multiple instances of the Booking Service.
- Requests may be retried (client-side or via the gateway).
- We may eventually integrate bookings with other services (e.g., notifications or billing).

We need a robust strategy that works under concurrency and retries.

## Decision

We will use a combination of:

1. **Database-level uniqueness constraint** in the Booking Service:

   - A unique index on `(resourceId, timeslot[, tenantId])` in the bookings table.
   - This is the ultimate source of truth for preventing duplicates.

2. **Idempotent booking endpoint**:

   - `POST /bookings` will accept an `Idempotency-Key` header (a client-generated UUID).
   - The Booking Service will:
     - store and reuse the result for the same idempotency key,
     - return the original booking instead of creating a new one if the request is repeated.

3. **Outbox pattern for events**:

   - When a booking is created, a `ResourceReserved` event will be stored in an **outbox** table within the same database transaction.
   - A background process will publish events from the outbox to the message broker.
   - This prevents losing events even if the service crashes after committing the booking.

## Options Considered

1. **Application-level locking only (e.g., using distributed locks)**

   - Pros: can work in some scenarios.
   - Cons:
     - easy to misconfigure,
     - still need DB protection for edge cases (locks not acquired, bugs, etc.).

2. **Database constraint only, no idempotency**

   - Pros: simple, strong guarantee from DB.
   - Cons:
     - clients may see errors for valid retries (e.g., network timeouts),
     - harder to build a good UX under unreliable networks.

3. **Combination of DB constraint + idempotency + Outbox (Chosen)**

   - Pros:
     - strong correctness at the DB level,
     - safe retries for clients,
     - reliable event publishing for downstream consumers.
   - Cons:
     - more moving parts (idempotency store, outbox processor).

## Consequences

### Positive

- **Strong consistency** on booking uniqueness: the database enforces the no-overbooking rule.
- **Safe retries**: clients can safely retry the booking request with the same idempotency key.
- **Reliable integration**: downstream services (e.g., Notification) can trust that `ResourceReserved` events correspond to committed bookings.

### Negative

- **Additional complexity**: we need to manage:
  - an idempotency key store,
  - an outbox table and a publisher component.
- **Operational cost**: the outbox publisher must be monitored (to ensure events are not stuck).

### Implementation Notes

- The uniqueness constraint will likely be on:
  - `(tenantId, resourceId, timeslot)` to maintain per-tenant isolation.
- On conflict (duplicate), the service should:
  - return a conflict error when there is no matching idempotency key,
  - or return the existing booking when it detects a retry with the same idempotency key.
- Events published from the outbox should be **idempotent** and/or have unique identifiers so that consumers can handle duplicates safely.

### Status and Next Steps

- Status: **Proposed** for Phase 1.
- In Phase 2–3, we will:
  - implement a simple in-memory or DB-backed idempotency store,
  - implement the outbox publishing mechanism,
  - add tests for concurrent bookings and retry scenarios.
