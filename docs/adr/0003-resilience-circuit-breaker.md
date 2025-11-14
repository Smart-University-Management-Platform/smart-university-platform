# ADR-0003: Resilience with Circuit Breaker

Status: Proposed  
Date: 2025-11-XX  
Decision Drivers: reliability, fault isolation, user experience under partial failure

## Context

The platform depends on **inter-service communication** and external providers:

- Exam Service → Notification Service (to inform students about exam events).
- Marketplace Service → Payment Provider.
- Other services may evolve to depend on Notification or external APIs.

If one service or external dependency becomes slow or unavailable:

- upstream services can get blocked,
- threads/connections can pile up,
- failures can cascade and affect the whole system.

We need a strategy to **protect critical calls** and **avoid cascading failures**.

## Decision

We will introduce a **Circuit Breaker** pattern for critical synchronous calls, starting with:

- **Exam Service → Notification Service**

Key behaviors:

- When the Exam Service calls Notification to send “exam started” or similar messages:
  - it will use a client with:
    - a **timeout** (e.g., 300–500 ms),
    - a **retry policy** with a limited number of retries (e.g., 2 attempts) and backoff.
  - it will track failures over a sliding window.

- If the failure rate or timeout rate crosses a threshold:
  - the circuit will **open** and temporarily **stop calling** Notification directly.
  - instead of blocking, Exam will:
    - record the need to notify (e.g., log or enqueue a message for later),
    - return a degraded but fast response to the client.

- After a cool-down period:
  - the circuit will move to **half-open** and test a small number of calls.
  - if they succeed, it will **close** the circuit and resume normal calls.

The same pattern can later be applied to other critical dependencies, for example:

- Marketplace → Payment Provider,
- Booking → external resource directory (if any),
- Notification → Email/SMS Provider.

## Options Considered

1. **No Circuit Breaker, just timeouts/retries**

   - Pros: simpler to implement.
   - Cons: continuous retries can still overload a failing dependency; upstream services may remain slow.

2. **Circuit Breaker only at API Gateway**

   - Pros: centralised; protects all downstream services from client load.
   - Cons: does not protect **service-to-service** calls where internal dependencies fail.

3. **Circuit Breaker in service-to-service clients (Chosen)**

   - Pros: fine-grained control per dependency; aligns with microservice resilience patterns.
   - Cons: more moving parts; requires good observability to tune thresholds.

## Consequences

### Positive

- **Improved reliability**: a failing Notification or Payment system does not necessarily bring down Exam or Marketplace.
- **Better user experience**: instead of long waits, users get fast feedback even if some non-critical actions are delayed.
- **Clear resilience point**: we know exactly which interactions are protected and can measure their behavior.

### Negative

- **Complexity**: requires configuration and tuning of thresholds, timeouts, and retry behavior.
- **Partial behavior**: some operations may be “degraded” (e.g., exam starts without immediate notification) and we must design for that.
- **Observability requirements**: we need metrics and logs to see when circuits open/close.

### Implementation Notes

- We will:
  - start with Exam → Notification as the first Circuit Breaker use case,
  - define default settings (timeouts, max retries, error thresholds),
  - log state transitions (closed → open → half-open → closed),
  - expose metrics for monitoring (e.g., open circuit count per dependency).

### Status and Next Steps

- Status: **Proposed** for Phase 1.
- In Phase 3, when implementing patterns, we will:
  - choose a specific library/approach for Circuit Breaker,
  - confirm which additional service interactions should be protected.
