# C4 – Level 2: Containers

## Purpose

This view shows the main **runtime building blocks** (containers) of the Smart University Management Platform and how they communicate.

## Overview

The platform is implemented as a set of microservices behind an API Gateway, using a message broker for asynchronous communication and Redis for caching. Each service owns its own database and implements multi-tenancy.

## Containers

### Web / Mobile Client

- **Responsibility:** User interface for students, instructors, and tenant admins.
- **Technology (example):** React / Next.js / mobile app (not fixed in Phase 1).
- **Communication:** Calls the API Gateway over HTTPS.

---

### API Gateway

- **Responsibility:**
  - Single entrypoint for all client requests.
  - Validates JWT tokens and extracts claims (`sub`, `tenantId`, `roles`).
  - Routes HTTP requests to backend services.
  - Central place for logging, rate limiting, CORS, etc.
- **Communication:** Sync HTTP with backend services; may publish some audit events.

---

### Auth Service

- **Responsibility:**
  - User registration and login.
  - Issues JWTs with claims `sub` (user id), `tenantId` (faculty/vendor), `roles`.
  - Manages basic user profile data.
- **Data:** Owns the **User** data model and related tables.
- **Communication:**
  - Sync HTTP from the Gateway.
  - May publish `UserRegistered` events to the broker.

---

### Booking Service

- **Responsibility:**
  - Manages **resources** (rooms, labs, equipment) and **bookings**.
  - Enforces **anti-overbooking** (unique `(resourceId, timeslot)`).
- **Interfaces:**
  - `GET /resources`
  - `POST /resources`
  - `POST /bookings`
  - `GET /bookings/my`
  - 
- **Constraints:** Must prevent two bookings for the same resource and overlapping time.
- **Data:** Owns **Resource** and **Booking** tables (multi-tenant).
- **Communication:**
  - Sync HTTP (list resources, create bookings, get booking details).
  - Publishes `ResourceReserved` events to the broker.

---

### Marketplace Service

- **Responsibility:**
  - Manages products/events and customer orders.
  - Coordinates an **Order Saga** (reserve inventory, charge payment, confirm/cancel).
- **Interfaces:**
  - `POST /products` – create product
  - `GET /products` – list products
  - `POST /cart/items` – add item to cart
  - `POST /orders` – start checkout Saga
- **Data:** Owns **Product**, **Inventory**, **Order**, and **OrderItem** tables.
- **Communication:**
  - Sync HTTP for product catalogue and cart operations.
  - Publishes/consumes events like `OrderPlaced`, `InventoryReserved`, `OrderConfirmed`, `OrderCancelled`.
  - Integrates with **Payment Provider** (typically via HTTP).
- **Dependencies:**
  - Payment Provider (or simulated payment component)
  - Notification Service (e.g., notify order success)
  - Message Broker (RabbitMQ) for publishing order events

---

### Exam Service

- **Responsibility:**
  - Manages **exams** and **exam sessions**.
  - Starts exams and triggers notifications for students.
- **Data:** Owns **Exam**, **ExamQuestion**, **ExamSession**, **ExamAnswer** tables.
- **Communication:**
  - Sync HTTP for exam creation and participation.
  - Calls **Notification Service** for “exam started” announcements.
  - This call is protected by a **Circuit Breaker**.
- **Interfaces:**
  - `POST /exams`
  - `POST /exams/{id}/start`

---

### Notification Service

- **Responsibility:**
  - Sends notifications via Email/SMS/other channels.
  - Consumes events from other services (e.g., `UserRegistered`, `ResourceReserved`, `OrderConfirmed`, `ExamStarted`).
- **Data:** May store notification templates and delivery logs.
- **Interfaces:**
  - `POST /notifications`
- **Communication:**
  - Exposes HTTP API (e.g., `/notifications`).
  - Subscribes to events on the **Message Broker**.
  - Integrates with **Email/SMS Provider**.

---

### IoT Ingest & Dashboard (Optional)

- **Responsibility:**
  - Receives sensor readings (e.g., classroom temperature).
  - Stores and exposes data for a simple real-time dashboard.
- **Interfaces:**
  - `POST /sensors/{id}/readings`
  - `GET /sensors/{id}/latest`
  - 
- **Data:** Sensor readings, aggregated metrics.
- **Communication:**
  - HTTP or MQTT/WebSocket ingest.
  - May publish `SensorReadingIngested` events.
  - Read-side APIs consumed by the frontend dashboard.

---

### Shuttle Tracking Service (Optional)

- **Responsibility:**
  - Tracks the location of a campus shuttle.
  - Exposes shuttle position and routes to clients.
- **Data:** Shuttle positions, route definitions.
- **Communication:**
  - HTTP API to fetch current position / route.
  - Uses **Map/Geocoding Service** when needed.
- **Interfaces:**
  - `GET /shuttle/location`
---

### Message Broker (e.g., RabbitMQ)

- **Responsibility:**
  - Enables **event-driven** communication between services.
  - Handles asynchronous flows such as:
    - order workflows,
    - notification delivery,
    - IoT ingestion.
- **Events (examples):**
  - `UserRegistered`
  - `ResourceReserved`
  - `OrderPlaced`, `InventoryReserved`, `OrderConfirmed`, `OrderCancelled`
  - `ExamStarted`
  - `SensorReadingIngested`

---

### Redis Cache

- **Responsibility:**
  - Improves performance and lowers latency (p95 < 400 ms target).
  - Caches frequently accessed data (e.g., resource lists, product catalogues).
- **Communication:**
  - Accessed by services like Booking, Marketplace, Exam for read-heavy endpoints.

---

### Databases (Per Service, Multi-Tenant)

- **Responsibility:**
  - Each service owns its own database (or schema) and data model.
  - Enforces **multi-tenancy** (proposed: tenant-per-schema).
- **Examples:**
  - `auth_db` (users, credentials)
  - `booking_db` (resources, bookings)
  - `marketplace_db` (products, orders)
  - `exam_db` (exams, sessions, answers)
  - `notification_db` (notifications, templates)
- **Multi-tenancy strategy:** described in ADR-0002.

---

## Container Diagram (Text Sketch)

```text
[ Web / Mobile Clients ]
           |
           v
     [ API Gateway ]
           |
   +-------+-------------------------------+
   |       |        |        |        |    |
   v       v        v        v        v    v
[ Auth ] [ Booking ][ Marketplace ][ Exam ][ Notification ]  [ IoT ]  [ Shuttle ]
   |         |           |           |          ^              |         |
   |         |           |           |          |              |         |
   +---------+-----------+-----------+----------+--------------+---------+
                         |
                 (async events)
                         v
                  [ Message Broker ]
                         |
          +--------------+------------------+
          |              |                  |
          v              v                  v
   [ Notification ]  [ Marketplace ]   [ Other services ]

## 3. Container Relationships Summary

- Web Frontend → API Gateway → Microservices.
- Microservices → DBs (own schema) and Redis.
- Microservices ↔ Message Broker for async events.
- Exam Service → Notification Service with Circuit Breaker.
- Marketplace Service ↔ Payment Provider (simulated).