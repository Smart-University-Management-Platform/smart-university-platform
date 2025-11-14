# ADR-0004: Performance and Caching (p95 < 400 ms)

Status: Proposed  
Date: 2025-11-XX  
Decision Drivers: response time (p95), user experience, load handling

## Context

The platform aims to provide responsive APIs, with a target of:

- **95% of requests (p95) completing under 400 ms** for typical operations.

Some paths are naturally heavier than others, for example:

- listing many resources or products,
- generating dashboards (IoT),
- aggregating bookings or orders.

We need a strategy to keep response times acceptable under normal load and reasonable peaks.

## Decision

We will adopt a set of performance and caching strategies:

1. **Use Redis as a shared cache** for read-heavy or frequently accessed data:

   - Examples:
     - resource catalogue (Booking),
     - product catalogue (Marketplace),
     - read-side views for IoT dashboards.
   - Cache entries will have a **Time-To-Live (TTL)** and/or be invalidated by events.

2. **Apply pagination and filtering** on list endpoints:

   - `GET /resources`, `GET /products`, `GET /orders`, etc.
   - Default page size for “list” operations (reasonable for students and demo).

3. **Push non-critical work to asynchronous paths**:

   - For example, sending notifications should not block the main user flow when not strictly required.
   - Use events and background processors where possible.

4. **Optimize database access**:

   - Basic indexing on frequently filtered columns (`tenant_id`, `resourceId`, `timeslot`, `status`).
   - Avoid N+1 query patterns.

5. **Measure and monitor**:

   - Log request latency per endpoint (at least coarse metrics).
   - Identify slow endpoints and iterate.

## Options Considered

1. **Do nothing special, rely only on DB and simple code**

   - Pros: simpler to implement.
   - Cons: likely to miss the p95 target under moderate load; not aligned with the performance requirement.

2. **Heavy pre-computation for all views**

   - Pros: very fast reads.
   - Cons: overkill for a teaching project; complicated write-side logic and eventual consistency.

3. **Lightweight caching + good API design (Chosen)**

   - Pros: good balance of complexity and benefit.
   - Cons: requires some effort to design cache keys and invalidation.

## Consequences

### Positive

- **Improved response times** for read-heavy endpoints.
- **Lower database load** thanks to Redis caching.
- **Predictable client behavior** due to enforced pagination.

### Negative

- **Cache invalidation complexity**:
  - we must ensure that cached data is reasonably fresh,
  - risk of serving briefly stale data if invalidation is not perfect.
- **Operational overhead**:
  - Redis is another component to run and monitor.

### Implementation Notes

- Start with simple patterns:
  - cache GET list endpoints with a short TTL (e.g., 30–120 seconds),
  - invalidate or update entries when relevant events are emitted (e.g., `ResourceUpdated`, `ProductUpdated`).
- Prefer **safe defaults** over aggressive caching:
  - it is better to miss some caching opportunity than to serve stale or incorrect data.
- Performance testing:
  - run small synthetic tests to verify that p95 latency is within the target for key endpoints.

### Status and Next Steps

- Status: **Proposed** for Phase 1.
- In Phase 3–4, revisit based on actual measurements and implementation details.
