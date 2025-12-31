# Smart University Microservices Platform

A production-style microservices platform for university management, demonstrating distributed systems patterns including **Saga**, **Circuit Breaker**, **State**, **Strategy**, and **Observer** patterns.

> **Course:** Software Analysis and Design  
> **Instructor:** Dr. Feizi

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Design Patterns](#design-patterns)
- [Services](#services)
- [Quick Start](#quick-start)
- [Demo Accounts](#demo-accounts)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [Documentation](#documentation)

---

## Project Overview

### Features

| Module | Description |
|--------|-------------|
| **Authentication** | JWT-based auth with RBAC (Student, Teacher, Admin) |
| **Booking** | Resource reservation with overbooking prevention |
| **Marketplace** | Products and orders with Saga-based checkout |
| **Exams** | Create, start, submit exams with State pattern |
| **Dashboard** | Live IoT sensors and shuttle tracking |
| **Notifications** | Event-driven notifications via RabbitMQ |

### Non-Negotiable Requirements

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Microservices Architecture | ✅ | 8 independent services |
| Saga Pattern | ✅ | `OrderSagaService` for checkout |
| Circuit Breaker | ✅ | `NotificationClient` with Resilience4j |
| Event-Driven (RabbitMQ) | ✅ | Order/Exam events → Notification |
| API Gateway | ✅ | Spring Cloud Gateway with JWT |
| Multi-Tenancy | ✅ | Row-level isolation with `tenant_id` |

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Smart University Platform                     │
├─────────────────────────────────────────────────────────────────┤
│  👤 Students    👨‍🏫 Teachers    👨‍💼 Admins                         │
│                           │                                      │
│                    ┌──────▼──────┐                               │
│                    │ React SPA   │  :3200                        │
│                    └──────┬──────┘                               │
│                           │ HTTP/JWT                             │
│                    ┌──────▼──────┐                               │
│                    │ API Gateway │  :8080                        │
│                    └──────┬──────┘                               │
│         ┌─────────────────┼─────────────────┐                   │
│    ┌────▼────┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐          │
│    │  Auth   │  │ Booking │  │ Market  │  │  Exam   │          │
│    │ :8081   │  │ :8082   │  │ :8083   │  │ :8085   │          │
│    └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘          │
│         │            │            │            │                 │
│    ┌────▼────┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐          │
│    │PostgreSQL│ │PostgreSQL│ │PostgreSQL│ │PostgreSQL│          │
│    └─────────┘  └─────────┘  │ + Redis │  └─────────┘          │
│                              └─────────┘                        │
│    ┌─────────────────────────────────────────────────────┐      │
│    │                    RabbitMQ                          │      │
│    │  📨 order.confirmed  📨 exam.started                 │      │
│    └─────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### Service Ports

| Service | Port | Database |
|---------|------|----------|
| API Gateway | 8080 | - |
| Auth Service | 8081 | auth-db |
| Booking Service | 8082 | booking-db |
| Marketplace Service | 8083 | market-db |
| Payment Service | 8084 | payment-db |
| Exam Service | 8085 | exam-db |
| Notification Service | 8086 | notification-db |
| Dashboard Service | 8087 | dashboard-db |
| Frontend | 3200 | - |
| RabbitMQ UI | 15800 | - |
| Redis | 6379 | - |

---

## Design Patterns

### Implemented Patterns (7 total, requirement: 5+)

| Pattern | Location | Purpose |
|---------|----------|---------|
| **Saga** | `marketplace-service/OrderSagaService` | Distributed transaction orchestration |
| **Circuit Breaker** | `exam-service/NotificationClient` | Fault tolerance for external calls |
| **State** | `exam-service/state/*` | Exam lifecycle management |
| **Strategy** | `payment-service/strategy/*` | Payment provider abstraction |
| **Observer** | `notification-service/NotificationListeners` | Event-driven notifications |
| **Repository** | All services | Data access abstraction |
| **Factory** | `exam-service/ExamStateFactory` | State object creation |

### Pattern Details

#### Saga Pattern (Marketplace Checkout)
```
1. Create PENDING order
2. Call Payment Service for authorization
3. Decrement stock with pessimistic locking
4. On failure: Cancel order + compensate payment
5. On success: Publish OrderConfirmedEvent
```

#### Circuit Breaker (Exam → Notification)
```
CLOSED ──[failures > threshold]──► OPEN
   ▲                                  │
   │                            [timeout]
   │                                  ▼
   └────[success]──────────── HALF_OPEN
```

#### State Pattern (Exam Lifecycle)
```
DRAFT ──► SCHEDULED ──► LIVE ──► CLOSED
```

---

## Services

### Auth Service
- User registration (defaults to STUDENT role)
- JWT token generation with role, tenant, username claims
- Password validation (8+ chars, uppercase, lowercase, digit, special char)
- Account lockout after 5 failed attempts

### Booking Service
- Resource management (rooms, labs)
- Reservation with pessimistic locking (no overbooking)
- Duration validation (30 min to 24 hours)

### Marketplace Service
- Product catalog with Redis caching
- Saga-based checkout with compensation
- Order history

### Exam Service
- State pattern for exam lifecycle
- Circuit Breaker for notification calls
- Student submission with duplicate prevention

### Notification Service
- RabbitMQ event listeners (Observer pattern)
- Event logging for audit trail

### Dashboard Service
- IoT sensor simulation (temperature, humidity, CO2, energy)
- Shuttle GPS tracking simulation

---

## Quick Start

### Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker + Docker Compose** (Linux)
- **Git** for cloning the repository

### Start All Services

```bash
# Clone the repository
git clone <repository-url>
cd smart-university

# Start all services
docker compose up --build
```

Wait 2-3 minutes for all services to initialize.

### Access Points

| Service | URL |
|---------|-----|
| Frontend SPA | http://localhost:3200 |
| API Gateway | http://localhost:8080 |
| RabbitMQ UI | http://localhost:15800 (guest/guest) |

### Stop Services

```bash
docker compose down
```

### Windows Scripts

```cmd
scripts\start-platform.bat      # Start platform
scripts\start-platform.bat -d   # Start detached
scripts\run-tests.bat           # Run backend tests
scripts\clean-all.bat           # Clean build artifacts
scripts\docker-cleanup.bat      # Clean Docker resources
scripts\docker-nuke.bat         # Remove ALL Docker resources (use with caution)
.\scripts\check-health.ps1      # PowerShell: Check service health
.\scripts\test-api.ps1          # PowerShell: Run API tests
```

### Linux/macOS Scripts

```bash
# Make scripts executable (first time only)
chmod +x scripts/*.sh

./scripts/start-platform.sh      # Start platform
./scripts/start-platform.sh -d   # Start detached
./scripts/run-tests.sh           # Run backend tests
./scripts/run-tests.sh --all     # Run backend + frontend tests
./scripts/clean-all.sh           # Clean build artifacts
./scripts/docker-cleanup.sh      # Clean Docker resources
./scripts/check-health.sh        # Check service health
./scripts/test-api.sh            # Run API tests
```

---

## Demo Accounts

Pre-created accounts in the `engineering` tenant:

| Username | Password | Role |
|----------|----------|------|
| `admin` | `Admin123!` | ADMIN |
| `teacher` | `Teacher123!` | TEACHER |
| `student` | `Student123!` | STUDENT |

### Demo Walkthrough

1. **Login as Teacher** → Create a product in Marketplace
2. **Login as Student** → Buy the product (observe Saga flow)
3. **Login as Teacher** → Create and start an exam
4. **Login as Student** → Take the exam and submit answers
5. **View Dashboard** → See live sensor readings and shuttle position

---

## API Reference

### Authentication

```bash
# Register (password: 8+ chars with uppercase, lowercase, digit, special char)
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"Test123!","tenantId":"engineering"}'

# Login
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"Test123!","tenantId":"engineering"}'
```

### Booking

```bash
# List resources
curl http://localhost:8080/booking/resources \
  -H "Authorization: Bearer <token>"

# Create reservation
curl -X POST http://localhost:8080/booking/reservations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"resourceId":"<uuid>","startTime":"2024-01-01T10:00:00Z","endTime":"2024-01-01T11:00:00Z"}'
```

### Marketplace

```bash
# List products
curl http://localhost:8080/market/products \
  -H "Authorization: Bearer <token>"

# Checkout (Saga)
curl -X POST http://localhost:8080/market/orders/checkout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"<uuid>","quantity":1}]}'
```

### Exams

```bash
# Create exam (TEACHER only)
curl -X POST http://localhost:8080/exam/exams \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Quiz","startTime":"2024-01-01T10:00:00Z","questions":[{"text":"What is 2+2?"}]}'

# Start exam
curl -X POST http://localhost:8080/exam/exams/<id>/start \
  -H "Authorization: Bearer <token>"

# Submit answers (STUDENT only)
curl -X POST http://localhost:8080/exam/exams/<id>/submit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"answers":{"q1":"4"}}'
```

### Dashboard

```bash
# Get sensors
curl http://localhost:8080/dashboard/sensors \
  -H "Authorization: Bearer <token>"

# Get shuttle position
curl http://localhost:8080/dashboard/shuttle \
  -H "Authorization: Bearer <token>"
```

---

## Testing

### Backend Tests

```bash
# Run all tests (requires Maven)
mvn test

# Or with Docker
docker compose run --rm auth-service mvn test
```

### Frontend Tests

```bash
cd frontend
npm install
npm test
```

### Test Coverage

| Category | Status |
|----------|--------|
| Auth Integration | ✅ Pass |
| Booking (+ Concurrency) | ✅ Pass |
| Marketplace Saga | ✅ Pass |
| Exam State Machine | ✅ Pass |
| Circuit Breaker | ✅ Pass |
| Frontend Components | ✅ Pass |

---

## Troubleshooting

### Services Not Starting

```bash
# Clean restart
docker compose down -v
docker compose up --build
```

### Port Already in Use

```bash
# Check port usage
netstat -ano | findstr :8080  # Windows
lsof -i :8080                 # Linux/Mac
```

### Database Connection Errors

```bash
# Restart databases
docker compose restart auth-db booking-db market-db
```

### RabbitMQ Issues

1. Open http://localhost:15800
2. Login: guest/guest
3. Check "Queues" and "Exchanges" tabs

### Clear Redis Cache

```bash
docker exec -it redis redis-cli -a changeme FLUSHALL
```

---

## Project Structure

```
smart-university/
├── frontend/                    # React + TypeScript SPA
│   ├── src/
│   │   ├── pages/              # Login, Dashboard, Booking, etc.
│   │   ├── components/         # Toast, ErrorBoundary, etc.
│   │   └── state/              # AuthContext, ThemeContext
│   └── package.json
│
├── auth-service/               # JWT authentication
├── booking-service/            # Resource reservations
├── marketplace-service/        # Products + Saga checkout
├── payment-service/            # Payment strategy
├── exam-service/               # State pattern + Circuit Breaker
├── notification-service/       # Observer pattern
├── dashboard-service/          # IoT simulation
├── gateway-service/            # API Gateway
├── common-lib/                 # Shared utilities
│
├── docs/
│   ├── AI_Log.md              # AI interaction log
│   ├── Learning_Report.md     # Technical learnings
│   └── adrs/                  # Architecture Decision Records
│       ├── 001-service-boundaries.md
│       ├── 002-multi-tenancy-strategy.md
│       ├── 003-saga-vs-two-phase-commit.md
│       ├── 004-circuit-breaker-for-notification.md
│       └── 005-database-per-service.md
│
├── scripts/                    # Start/test scripts
├── docker-compose.yml          # Full stack orchestration
└── README.md                   # This file
```

---

## Documentation

### Required Project Documents

| Document | Path | Description |
|----------|------|-------------|
| AI Log | `docs/AI_Log.md` | AI interaction summary |
| Learning Report | `docs/Learning_Report.md` | Technical learnings on Saga, Circuit Breaker |
| ADRs | `docs/adrs/` | 5 Architecture Decision Records |

### Security Features

- JWT authentication with role-based access control
- Password validation (8+ chars, complexity requirements)
- Rate limiting (10 login/min, 5 register/min)
- Account lockout (5 failed attempts → 15 min lock)
- XSS protection via input sanitization
- Multi-tenant data isolation

### Key Technical Decisions

1. **Database-per-Service**: Each microservice has its own PostgreSQL database
2. **Row-Level Multi-Tenancy**: `tenant_id` column on all tenant-bound tables
3. **Orchestrated Saga**: Marketplace orchestrates checkout, not choreography
4. **Circuit Breaker**: Exam starts succeed even if notifications fail
5. **Stateless Services**: JWT tokens carry all auth state

---

## Requirements Checklist

### Functional Requirements

| Code | Requirement | Status |
|------|-------------|--------|
| FR-01 | User registration/login | ✅ |
| FR-02 | JWT authentication | ✅ |
| FR-03 | View bookable resources | ✅ |
| FR-04 | Book with no overbooking | ✅ |
| FR-05 | Sellers create products | ✅ |
| FR-06 | Saga-based checkout | ✅ |
| FR-07 | Teachers create exams | ✅ |
| FR-08 | Students submit exams | ✅ |
| FR-09 | Dashboard sensors | ✅ |
| FR-10 | Shuttle tracking | ✅ |

### Non-Functional Requirements

| Code | Requirement | Status |
|------|-------------|--------|
| NFR-S01 | Horizontal scalability | ✅ |
| NFR-MT01 | Multi-tenancy isolation | ✅ |
| NFR-SE01 | JWT + RBAC | ✅ |
| NFR-R01 | Circuit Breaker resilience | ✅ |
| NFR-R02 | No overbooking | ✅ |
| NFR-MN01 | 5+ design patterns | ✅ (7 patterns) |
| NFR-MN02 | ADR documentation | ✅ (5 ADRs) |

---

## License

This project is for educational purposes as part of the Software Analysis and Design course.

---

*Last Updated: December 2024*
