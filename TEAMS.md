# Team Assignments & Integration Guide (The "Bible")

**Goal**: Build a distributed Smart University Platform.
**Rule #1**: Follow these specs EXACTLY. Do not change port numbers, table names, or JSON fields.

---

## 🌍 Global Standards
- **Backend**: Java 21, Spring Boot 3.2.3
- **Frontend**: Next.js 14, Tailwind CSS
- **Database**: PostgreSQL
- **Package**: `com.smartuniversity.<service>`

### 🔌 Port Assignments
| Service | Port | Team |
| :--- | :--- | :--- |
| **Gateway** | `8080` | Alpha |
| **Auth** | `8081` | Alpha |
| **Booking** | `8082` | Beta |
| **Marketplace** | `8083` | Gamma |
| **Exam** | `8084` | Delta |
| **Notification** | `8085` | Delta |

---

## � Team Alpha: Core & Auth
**Members**: [Name 1], [Name 2]
**Responsibility**: Gateway, Auth Backend, Login Frontend.

### 🤖 AI Prompts (Copy & Paste in Order)

#### Step 1: Backend - Auth Service (Port 8081)
> "I am building a Spring Boot Auth Service on port 8081. Package: `com.smartuniversity.auth`.
> 1. Create a `User` entity with ID (UUID), email (unique), password, fullName, and role (enum: STUDENT, INSTRUCTOR).
> 2. Create a `AuthController` with:
>    - `POST /api/auth/register`: Accepts email, password, name. Hashes password. Saves user. Publishes message to RabbitMQ exchange 'user-events' (key: 'user.registered') with JSON `{'userId': '...', 'email': '...'}`.
>    - `POST /api/auth/login`: Verifies password. Returns a JWT string with claims: sub=userId, role=role."

#### Step 2: Backend - API Gateway (Port 8080)
> "I am building a Spring Cloud Gateway on port 8080.
> 1. Configure `application.yml` to route traffic:
>    - `/api/auth/**` -> `http://localhost:8081`
>    - `/api/bookings/**` -> `http://localhost:8082`
>    - `/api/store/**` -> `http://localhost:8083`
>    - `/api/exams/**` -> `http://localhost:8084`
> 2. Add a global CORS configuration to allow requests from `http://localhost:3000` (Frontend)."

#### Step 3: Frontend - Login Page
> "I am building a Next.js 14 Login page using Tailwind CSS.
> 1. Create a form with Email and Password fields.
> 2. On submit, call `POST http://localhost:8080/api/auth/login`.
> 3. If successful, save the received JWT token to localStorage and redirect to `/dashboard`."

---

## 🔵 Team Beta: Academic Resources
**Members**: [Name 3], [Name 4]
**Responsibility**: Booking Backend, Booking UI.

### 🤖 AI Prompts (Copy & Paste in Order)

#### Step 1: Backend - Booking Service (Port 8082)
> "I am building a Spring Boot Booking Service on port 8082. Package: `com.smartuniversity.booking`.
> 1. Create `Resource` entity (id, name, type, capacity) and `Booking` entity (id, resourceId, userId, startTime, endTime).
> 2. Create `BookingController` with:
>    - `GET /api/bookings/resources`: Lists all resources.
>    - `POST /api/bookings`: Accepts resourceId, startTime, endTime. Extract userId from 'X-User-Id' header.
> 3. **Validation**: Before saving, query the DB to ensure no other booking overlaps with the requested time for that resource. Return 409 Conflict if occupied."

#### Step 2: Phase 3 - Anti-Overbooking (Optimistic Locking)
> "Update the `Booking` entity to include a `@Version` Long version field for Optimistic Locking.
> Modify the save method to handle `ObjectOptimisticLockingFailureException` and return a friendly error message if two users try to book the exact same room at the exact same millisecond."

#### Step 3: Frontend - Booking Page
> "I am building a Next.js 14 Booking page.
> 1. Fetch resources from `GET http://localhost:8080/api/bookings/resources` and display them as cards.
> 2. Add a 'Book' button to each card that opens a modal with Start/End time inputs.
> 3. On confirm, call `POST http://localhost:8080/api/bookings`. Include the JWT token in the Authorization header."

---

## 🟠 Team Gamma: Marketplace
**Members**: [Name 5], [Name 6]
**Responsibility**: Marketplace Backend, Store UI.

### 🤖 AI Prompts (Copy & Paste in Order)

#### Step 1: Backend - Marketplace Service (Port 8083)
> "I am building a Spring Boot Marketplace Service on port 8083. Package: `com.smartuniversity.marketplace`.
> 1. Create `Product` entity (id, name, price) and `Order` entity (id, userId, totalAmount, status).
> 2. Create `ProductController` with `GET /api/store/products`.
> 3. Create `OrderController` with `POST /api/store/orders`. It accepts a list of product IDs. Calculate total price. Save Order with status 'CREATED'."

#### Step 2: Phase 3 - Saga Pattern (Stub)
> "Implement a simple Saga step.
> 1. When an Order is created, publish a RabbitMQ message to 'order-events' (key: 'order.created').
> 2. Create a listener that listens for 'payment.failed'. If received, update the Order status to 'CANCELLED'."

#### Step 3: Frontend - Store Page
> "I am building a Next.js 14 Store page.
> 1. Fetch products from `GET http://localhost:8080/api/store/products`.
> 2. Display them in a grid with Name, Price, and 'Add to Cart' button.
> 3. Implement a simple Cart state.
> 4. Add a 'Checkout' button that calls `POST http://localhost:8080/api/store/orders` with the selected product IDs."

---

## 🟣 Team Delta: Engagement
**Members**: [Name 7], [Name 8]
**Responsibility**: Exam Backend, Notification Backend, Exam UI.

### 🤖 AI Prompts (Copy & Paste in Order)

#### Step 1: Backend - Exam Service (Port 8084)
> "I am building a Spring Boot Exam Service on port 8084. Package: `com.smartuniversity.exam`.
> 1. Create `Exam` entity (id, title, date).
> 2. Create `ExamController` with `POST /api/exams`.
> 3. When saved, publish message to RabbitMQ exchange 'exam-events' (key: 'exam.created') with JSON `{'examId': '...', 'title': '...', 'date': '...'}`."

#### Step 2: Backend - Notification Service (Port 8085)
> "I am building a Spring Boot Notification Service on port 8085. Package: `com.smartuniversity.notification`.
> 1. Configure RabbitMQ listeners for queues: 'user-events' and 'exam-events'.
> 2. When 'user.registered' is received, print: 'Simulating Email to ' + email.
> 3. When 'exam.created' is received, print: 'Simulating SMS to all students for exam ' + title."

#### Step 3: Phase 3 - Circuit Breaker
> "In Exam Service, add a Feign Client to call Notification Service directly.
> Wrap this call with Resilience4j Circuit Breaker.
> If Notification Service is down, fallback to a method that logs 'Notification service unavailable, queuing for later'."

#### Step 4: Frontend - Exam Dashboard
> "I am building a Next.js 14 Exam Dashboard.
> 1. Create a form to 'Create Exam' (Title, Date).
> 2. On submit, call `POST http://localhost:8080/api/exams`.
> 3. Show a success toast notification."
