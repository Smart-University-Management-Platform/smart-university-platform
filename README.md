# Smart University Management Platform
_Architecture Wiki — Phase 1_

> A microservices-based platform for managing key university and campus services (auth, bookings, marketplace, exams, notifications, IoT, shuttle, …).  
> This document is the entry point to the **architecture wiki** for Phase 1.

---

## 1. Project Overview

The Smart University Management Platform is a distributed system that supports core campus scenarios:

- student and instructor authentication,
- booking shared resources (e.g., rooms),
- a marketplace for events/services,
- online exams and notifications,
- optional IoT and shuttle tracking modules.

The focus of **Phase 1** is not implementation, but **understanding the domain and establishing a solid architecture** that can scale, remain reliable under load, and be easy to evolve.

This repo currently focuses on **architecture**. Implementation and deployment guides will be added in later phases.

---

## 2. Architecture Summary

At a high level, the platform is:

- **Microservices-based**: independent services for Auth, Booking, Marketplace, Exam, Notification, IoT, and Shuttle.
- Protected by an **API Gateway**: a single entry point for all clients.
- **Event-driven** where appropriate: services publish and consume events via a message broker (e.g., RabbitMQ).
- Designed with **resilience** in mind: at least one critical call (e.g., Exam → Notification) is protected by a Circuit Breaker.
- Built around **multi-tenancy**: multiple faculties/vendors share the system while their data remains strictly isolated.

Key services (conceptual):

- `Auth Service` – registration, login, issuing JWTs (`sub`, `tenantId`, `roles`).
- `Booking Service` – resource catalogue and reservations; prevents overbooking.
- `Marketplace Service` – products, carts, orders; orchestrates a Saga for the order workflow.
- `Exam Service` – exam definitions and exam sessions; uses Circuit Breaker when calling Notification.
- `Notification Service` – sends email/SMS/other notifications; consumes domain events.
- `IoT Service` (optional) – ingests sensor readings and feeds a live dashboard.
- `Shuttle Service` (optional) – exposes current shuttle location / routes.

---

## 3. C4 Model

The C4 model is used to describe the system at different levels of abstraction.

### 3.1 Level 1 — System Context

**File:** [`docs/arch/Context.md`](docs/arch/Context.md)  
Shows:

- primary actors: Student, Instructor, Tenant Admin;
- external systems: Payment Provider, Map/Geocoding, Email/SMS;
- how all client traffic flows through the API Gateway.

### 3.2 Level 2 — Containers

**File:** [`docs/arch/Container.md`](docs/arch/Container.md)  
Describes:

- the main containers (Gateway, individual services, message broker, caches, databases),
- responsibilities and key data ownership per service,
- where synchronous HTTP calls are used vs. asynchronous events.

Text sketch of the main runtime view:

```text
[ Web/Mobile Clients ]
          |
          v
    [ API Gateway ] --(sync HTTP)--> [ Auth ]
                                                   --> [ Booking ]
                          --> [ Marketplace ]
                          --> [ Exam ] --(CB)--> [ Notification ]
                          --> [ IoT ]
                          --> [ Shuttle ]

[ Services ] --(async events)--> [ Message Broker ] --> [ Notification, others ]

[ Redis / Caches ] and [ per-service Databases ] support performance and persistence.
```

Higher C4 levels (Component / Code) will be added later during implementation.

---

## 4. Architecture Decisions (ADRs)

Key architectural decisions are tracked as **ADR files** under `docs/adr/`.

Planned ADRs for this project:

- `ADR-0001 – Event-Driven Microservices + API Gateway`  
  - Why the system is decomposed into microservices behind a gateway  
  - When to use synchronous vs. asynchronous communication

- `ADR-0002 – Multi-Tenancy Strategy (Per-Schema)`  
  - Compares tenant-per-database vs. tenant-per-schema vs. shared tables  
  - Proposes tenant-per-schema initially, with an upgrade path for heavy tenants

- `ADR-0003 – Resilience with Circuit Breaker`  
  - Where we apply Circuit Breaker (e.g., Exam → Notification)  
  - Default timeouts, retry policy, and failure handling

- `ADR-0004 – Performance & Caching (p95 < 400ms)`  
  - When and how to use Redis cache, pagination, and query optimisation  
  - Constraints and invalidation strategy

- `ADR-0005 – Anti-Overbooking & Consistency`  
  - Preventing double-booking using a unique constraint `(resourceId, timeslot)`  
  - Use of idempotency keys and Outbox for reliable event publishing

Each ADR follows the same structure:

```text
Status: Proposed | Accepted | Superseded

Context
Options
Decision
Consequences
```

During Phase 1, most ADRs will be **Proposed**; later phases may mark them as **Accepted** or update them.

---

## 5. Quality Attributes (NFRs) and How We Address Them

The architecture is shaped by several key quality attributes.

### 5.1 Scalability

- Stateless services where possible, behind a load balancer.
- Horizontal scaling by adding more instances.
- Message broker used to offload long-running or high-volume operations.

### 5.2 Multi-Tenancy

- Each service owns its data model and implements tenant isolation.  
- Proposed approach: **tenant-per-schema** (per ADR-0002) for a good balance between isolation and operational cost.

### 5.3 Performance

- Target: **95% of API requests respond in under 400 ms**.  
- Use Redis caching, database indexing, and pagination; push non-critical work to asynchronous flows.

### 5.4 Security

- Centralised auth with JWT and role-based access control (RBAC).  
- `tenantId` is propagated from the gateway through to services and data storage.

### 5.5 Reliability & Resilience

- Circuit Breaker and sensible timeouts on critical synchronous calls.  
- Retry policies with backoff and jitter where appropriate.  
- Dead-letter queues (DLQ) for failed messages on the broker.

### 5.6 Maintainability

- Service boundaries aligned with clear business capabilities.  
- Use of well-known design patterns (e.g., Strategy, State, Observer) where they simplify the design.  
- All major architecture decisions documented via ADRs.

---

## 6. Repository Layout (Phase 1)

_Planned structure — actual implementation will grow in later phases._

```text
smart-university-platform/
├─ README.md                # Architecture wiki entry point (this file)
├─ AI_Log.md 
├─ docs/
|  ├─ infra/
|  |  └─Docker_Compose.yml         
│  ├─ arch/
│  │  ├─ Context.md         # C4 Level 1 – System Context
│  │  └─ Container.md       # C4 Level 2 – Containers
│  └─ adr/
│     ├─ 0001-event-driven-microservices-and-gateway.md
│     ├─ 0002-multi-tenancy-strategy.md
│     ├─ 0003-resilience-circuit-breaker.md
│     ├─ 0004-performance-and-caching.md
│     └─ 0005-anti-overbooking-and-consistency.md
└─ (implementation to be added in later phases)
```

As the project evolves, additional folders will be added for:

- `gateway/` – API gateway implementation  
- `services/` – microservices (auth, booking, marketplace, exam, notification, …)  
- `infra/` – infrastructure as code, docker-compose, etc.  
- `frontend/` – web or mobile client(s)

---

## 7. Phases (High-Level Roadmap)

- **Phase 1 – Discover & Foundation**  
  - Deliverable: this architecture wiki (README + C4 + initial ADRs)

- **Phase 2 – Core Prototype**  
  - Minimal working system with Auth + Booking + Gateway  
  - Short video demo (login + resource listing)

- **Phase 3 – Advanced Patterns**  
  - Implement Saga and Circuit Breaker in real flows  
  - Document lessons learned (`Learning_Report.md`)

- **Phase 4 – Integration & Storytelling**  
  - Complete prototype, final presentation and documentation  
  - Final architecture story tying design, code, and requirements together

---

## 8. Working With This Repo (Team Notes)

- Treat this README and the `docs/` folder as the **source of truth** for architecture.  
- Before making a significant change to the design, write or update an ADR.  
- Keep C4 diagrams and ADRs in sync with the implementation as you move into later phases.  
- Use issues and pull requests to discuss architectural changes so decisions are recorded and reviewable.

### AI usage (AI Mentor)

Whenever you ask AI for real project help (design, code, debugging, documentation), log it in AI_Log.md:

[YYYY-MM-DD] Team C – Asked AI how to design Saga orchestrator. 
Answer used to implement order workflow and ADR-0005.