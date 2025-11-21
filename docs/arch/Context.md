<!-- Context.md -->
# C4 – System Context Diagram

## 1. Purpose

This diagram describes the Smart University Platform at a high level:  
who uses it, which external systems are involved, and where the system boundaries are.

---

## 2. Primary Actors

### 2.1 Student

- Registers and logs in.
- Views and books resources.
- Buys products (e.g., workshop tickets) from the marketplace.
- Takes online exams.
- Views IoT dashboards and shuttle location.

### 2.2 Instructor

- Registers and logs in.
- Creates and manages exams.
- May create marketplace products (e.g., paid workshops).
- Uses resources and bookings.

### 2.3 Tenant Admin

- Represents a faculty or vendor.
- Manages:
  - Users of that tenant.
  - Resources and products for that tenant.
- Ensures data is isolated per tenant.

---

## 3. External Systems

### 3.1 Payment Provider (Real or Simulated)

- Used by Marketplace to simulate or process payments for orders.

### 3.2 Email/SMS Provider (Simulated)

- Target for Notification Service to send messages.
- In prototype, may be logging or an in-memory stub.

### 3.3 Map API (Optional)

- Used by frontend to display a map for the shuttle location.
- For prototype, can be a static image or built-in library.

### 3.4 AI Mentor (Development Only)

- External AI system used by the team to assist with:
  - Architecture design.
  - Implementation guidance.
  - Documentation.
- Not part of runtime architecture.

---

## 4. System Boundary: Smart University Platform

The platform includes:

- Web Frontend (UI)
- API Gateway
- Auth Service
- Booking Service
- Marketplace Service
- Exam Service
- Notification Service
- IoT Service
- Shuttle Service
- Message Broker (RabbitMQ)
- Redis Cache
- Databases

All of these components are inside the system boundary, typically deployed on a set of servers/containers.

---

## 5. High-Level Interaction (Text Diagram)

```text
          +----------------------+
          |       Student        |
          +----------------------+
                    |
          +----------------------+           +----------------------+
          |      Instructor      |           |     Tenant Admin     |
          +----------------------+           +----------------------+
                    \              \            /
                     \              \          /
                      v              v        v
                  +----------------------------------+
                  |        Web / Mobile UI          |
                  +----------------------------------+
                                  |
                                  v
                         +-------------------+
                         |    API Gateway    |
                         +-------------------+
                                  |
            ---------------------------------------------------------
            |           |             |            |        |       |
            v           v             v            v        v       v
        +--------+  +--------+   +----------+  +--------+ +-----+ +--------+
        |  Auth  |  |Booking |   |Marketplace| |  Exam  | | IoT | |Shuttle |
        +--------+  +--------+   +----------+  +--------+ +-----+ +--------+
                            \     /                |
                             v   v                 v
                          +------------------------------+
                          |       Notification Service  |
                          +------------------------------+

All services (except Frontend) may publish/consume messages via Message Broker (RabbitMQ).
Some read/write cached data via Redis.
All persist domain data into their own database/schema.
