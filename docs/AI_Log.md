# AI_Log

> This file records how we used AI assistance during the project  
> (tool: ChatGPT / GPT‑5.1 Pro).  
> The goal is transparency: when, for what, and how we used the outputs.

---

## 2025-11-21 – Initial Project Understanding & Team Plan

**Team(s):** All (A, B, C, D)  
**Phase:** Before Phase 1 / Phase 1 planning

**Prompt summary:**

- Asked AI to read/understand the “Smart University Platform” course project and our GitHub repo.
- Requested:
  - Breakdown of all functional and non‑functional requirements.
  - Explanation of all phases and deliverables.
  - A detailed 4×2 team split, with responsibilities per phase and Git/GitHub workflow.

**How we used the answer:**

- Took the proposed team structure (Teams A–D) and responsibilities across 4 phases.
- Adopted the idea of:
  - One **Phase Lead** per phase.
  - Per‑team feature branches (e.g. `phase-1/team-a-arch-docs`).


**What we changed ourselves:**

- Adjusted some naming and wording.
- Decided on Node.js + Express as our initial implementation stack (AI suggestion was generic).

---

## 2025-11-21 – Phase 1 Architecture Documents (File Templates)

**Team(s):** A, B, C, D  
**Phase:** Phase 1

**Prompt summary:**

- Asked AI to “give draft code” (ready‑to‑paste content) for the following docs:
  - `Auth.md`
  - `Booking.md`
  - `Container.md`
  - `Context.md`
  - `ExamNotification.md`
  - `IoT.md` (originally typo’d as `lot.md`)
  - `MarketPlace.md`
  - `UI-Shuttle.md`


**How we used the answer:**

- Created the files under `docs/arch/` with the content from AI as initial drafts.
- These documents now:
  - Define boundaries and domain models for each service.
  - Describe C4 Context and Container views.
  - Define how Exam and Notification interact (including the Circuit Breaker concept).
  - Describe UI flows and Shuttle/IoT behaviour.

**What we changed ourselves:**

- Adjusted naming 
- May refine fields / endpoints later as we implement real code.
- Will update ADRs and these docs when we make new architectural decisions.

---

## 2025-11-21 – Phase 1 Detailed Task Plan per Team (PHASE1_TEAM_TASKS.md)

**Team(s):** All (A, B, C, D)  
**Phase:** Phase 1

**Prompt summary:**

- Asked AI for a **very detailed**, step‑by‑step plan for Phase 1:
  - Exactly which files each team (A–D) must touch.
  - What content to add to each file.
  - Example Git commands (branch names, commit messages).
  - Explanation of implications (why each doc matters later).

**How we used the answer:**

- Used it as our checklist for:
  - Filling `README.md` with architecture sections.
  - Creating ADRs:
    - `0001-event-driven-microservices-and-gateway`
    - `0002-multi-tenancy-strategy`
    - `0003-resilience-circuit-breaker`
    - `0004-performance-and-caching`
    - `0005-anti-overbooking-and-consistency`
  - Creating/finishing `Context.md`, `Container.md`, `Booking.md`, `Marketplace.md`, etc.

**What we changed ourselves:**

- Tweaked some path names and commit messages.
- Decided which ADRs to fully complete immediately vs. leave partly as “initial draft”.

---

## 2025-11-21 – docker-compose Skeleton

**Team(s):** A  
**Phase:** Phase 2 preparation

**Prompt summary:**

- Asked AI: “create a docker compose draft code too”.
- Wanted a `docker-compose.yml` that:
  - Runs: gateway, auth, booking, marketplace, exam, notification, iot, shuttle, frontend.
  - Also runs infra: Postgres, RabbitMQ, Redis.
  - Uses service names like `auth-service`, `booking-service`, etc.

**How we used the answer:**

- Took the AI’s `docker-compose.yml` as a **starting point** and saved it under `infra/docker-compose.yml`.
- Kept:
  - Service names.
  - Basic env vars (DB host, ports, JWT secret).
  - Network and volumes sections.

**What we changed ourselves:**

- Adjusted:
  - Service folder paths to match our actual repo (`./services/auth-service`, etc.).
  - Port mappings to avoid conflicts.
- Will later refine:
  - Health checks.
  - Per-service DB names or schemas.

---

## 2025-11-21 – Phase 2 Implementation Skeletons (Node.js + Express)

**Team(s):** A, B, C, D  
**Phase:** Phase 2

**Prompt summary:**

- Asked AI to “implement the planning for phase two work for all teams from scratch to the end”.
- Wanted minimal, working Node.js/Express services:
  - **Gateway** (routing /api/auth, /api/booking, etc.).
  - **Auth Service**:
    - In‑memory register & login with bcrypt + JWT.
    - Roles + tenantId in token.
  - **Booking Service**:
    - In‑memory resources & bookings.
    - Endpoints:
      - `GET /booking/resources`
      - `POST /booking/resources` (tenant admin only)
      - `POST /booking/bookings`
      - `GET /booking/bookings/my`
    - Basic overbooking check (time‑interval overlap).
  - **Marketplace Service** stub with `/marketplace/health`.
  - **Exam & Notification** stubs:
    - Exam: `/exam/health`, simple `POST /exam/exams` + `GET /exam/exams`.
    - Notification: `/notification/health`, simple `POST /notification/notifications`.
  - A generic **Dockerfile** for Node services.
  - A **Phase 2 demo script** showing how to:
    - Register, login.
    - Create resource.
    - List resources.
    - Create booking and see overbooking error.

**How we used the answer:**

- Created the following files using the AI content as initial code:
  - `gateway/package.json`
  - `gateway/index.js`
  - `services/auth-service/package.json`
  - `services/auth-service/index.js`
  - `services/booking-service/package.json`
  - `services/booking-service/index.js`
  - `services/marketplace-service/package.json`
  - `services/marketplace-service/index.js`
  - `services/exam-service/package.json`
  - `services/exam-service/index.js`
  - `services/notification-service/package.json`
  - `services/notification-service/index.js`
  - `Dockerfile` in each service/gateway directory.
  - `docs/demo/phase2-demo-script.md`.
- This gave us a running **Phase 2 prototype** using only in‑memory data (no real DB yet).

**What we changed ourselves:**

- Verified ports and env vars are consistent with `docker-compose.yml`.
- Fixed / will fix:
  - Minor typos or mismatched route paths, if any.
  - Additional logging or error handling as we test.
- Plan to progressively replace in‑memory data structures with real DB integration.

---

## Summary (End of Phase 2)

Up to the end of **Phase 2**, we used AI mainly for:

- Architecture clarifications and planning.
- Generating initial documentation templates (C4, service docs).
- Producing a first version of `docker-compose.yml`.
- Generating **minimal Node.js/Express service skeletons** for:
  - Gateway
  - Auth
  - Booking
  - Marketplace (stub)
  - Exam (stub)
  - Notification (stub)
- Creating a Phase 2 demo script.

All AI-generated content is treated as **drafts**:
we review, edit, and adapt them before final submission.
