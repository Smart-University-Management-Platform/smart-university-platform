# ADR-0001: Event-Driven Microservices and API Gateway

Status: Proposed  
Date: 2025-11-XX  
Decision Drivers: scalability, autonomy, resilience, clear external interface

## Context

The Smart University Management Platform must support multiple independent capabilities:

- authentication and authorization,
- booking of shared resources,
- marketplace for products/events,
- exam management,
- notifications,
- optional IoT and shuttle tracking.

We expect:

- multiple teams to work in parallel,
- different quality attribute priorities per domain (e.g., Booking cares a lot about consistency, Notification about throughput),
- the need to evolve and deploy parts of the system independently.

At the same time, the platform must present a **simple, unified API** to web and mobile clients and must support both:

- synchronous request/response (e.g., login, list resources),
- asynchronous workflows (e.g., order processing, notifications, IoT ingestion).

## Decision

We will:

1. **Decompose the backend into microservices** aligned with business capabilities:

   - Auth Service  
   - Booking Service  
   - Marketplace Service  
   - Exam Service  
   - Notification Service  
   - IoT Service (optional)  
   - Shuttle Service (optional)

2. Place an **API Gateway** in front of all backend services:

   - All client traffic (Web/Mobile) goes through the gateway.
   - The gateway validates JWTs, extracts `tenantId` and `roles`, and forwards enriched requests to services.
   - The gateway handles cross-cutting concerns: CORS, rate limiting, basic logging, and request correlation IDs.

3. Use a **Message Broker** (e.g., RabbitMQ) for **event-driven communication** between services:

   - Services publish domain events such as `UserRegistered`, `ResourceReserved`, `OrderPlaced`, `OrderConfirmed`, `ExamStarted`, `SensorReadingIngested`.
   - Other services subscribe to these events and react asynchronously (e.g., Notification Service sending emails/SMS).

4. Use **synchronous HTTP calls** only where we need direct, immediate feedback to the client (e.g., login, booking confirmation, exam start).

## Options Considered

1. **Single Monolithic Backend**

   - Pros: simple deployment, simple local development.
   - Cons: poor team autonomy, harder to scale per domain, harder to isolate failures, less aligned with course goals.

2. **Microservices Without API Gateway**

   - Pros: less moving parts.
   - Cons: clients must know all service locations and APIs; cross-cutting concerns (auth, rate limiting) duplicated across services; difficult to change internal topology later.

3. **Microservices With API Gateway + Event-Driven Communication (Chosen)**

   - Pros: clear external entry point; good separation of concerns; supports both sync (HTTP) and async (events); easier to scale and evolve each service.
   - Cons: higher architectural complexity; requires more tooling (gateway, broker, observability).

## Consequences

### Positive

- **Scalability**: services can scale independently based on load (Booking, Marketplace, Notification can scale more than Auth).
- **Team autonomy**: teams can own services with clear boundaries and release cycles.
- **Resilience**: failures in one service can often be contained; asynchronous handling reduces direct coupling.
- **API stability**: clients only depend on the gateway API; internal services can evolve behind it.
- **Alignment with course requirements**: microservices, API Gateway, message broker, and event-driven design are all explicitly required.

### Negative

- **Operational complexity**: requires managing multiple services, the gateway, and the message broker.
- **Observability needs**: we must invest in logging, metrics, and tracing to understand distributed flows.
- **Integration testing**: end-to-end tests become more complex and require orchestrating multiple components.

### Status and Next Steps

- This ADR is **Proposed** for Phase 1 and will guide the initial PoC in Phase 2.
- In later phases, we may refine:
  - the exact gateway technology,
  - the choice of message broker,
  - the specific service boundaries if needed.
