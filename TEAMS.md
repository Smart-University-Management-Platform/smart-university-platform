# Team Assignments & Integration Guide (The "Bible")

**Goal**: Build a distributed Smart University Platform.
**Rule #1**: Follow these specs EXACTLY. Do not change port numbers, table names, or JSON fields.

### 👥 Team Roster
Please fill in your names below to assign responsibilities.

| Team       | Focus                 | Member 1 | Member 2 |
| :---       | :---                  | :---     | :---     |
| **Alpha**  | Gateway & Auth        | [Name]   | [Name] |
| **Beta**   | Booking & Resources   | [Name]   | [Name] |
| **Gamma**  | Marketplace           | [Name]   | [Name] |
| **Delta**  | Exams & Notifications | [Name]   | [Name] |

> **🎓 Beginner Note**: This document is the "Source of Truth" for our project. It defines who does what and how the different parts of our software talk to each other. "Distributed" means our app isn't just one big program; it's many small programs (services) working together.

---

## 🌍 Global Standards

These are the tools we are all using. Sticking to these ensures our code works together.

- **Backend**: Java 21, Spring Boot 3.2.3
    - *Explanation*: **Spring Boot** is our "engine". It runs on the server, processes data, and talks to the database. We use **Java** as the programming language.
- **Frontend**: Next.js 14, Tailwind CSS
    - *Explanation*: **Next.js** is our "face". It's what the user sees in their browser. **Tailwind CSS** is a utility to style our pages (colors, spacing) easily.
- **Database**: PostgreSQL
    - *Explanation*: **PostgreSQL** is our "filing cabinet". It's where we permanently store data like users, bookings, and grades.
- **Package**: `com.smartuniversity.<service>`
    - *Explanation*: This is the folder structure for our Java code. `<service>` will be replaced by the specific name of your work (e.g., `com.smartuniversity.auth`).

### 🔌 Port Assignments
Each service lives on a specific "Port" on your computer, like a specific apartment number in a building.

| Service | Port | Team | Description |
| :--- | :--- | :--- | :--- |
| **Gateway** | `8080` | Alpha | The entry point. All user requests go here first. |
| **Auth** | `8081` | Alpha | Handles Login and Registration. |
| **Booking** | `8082` | Beta | Manages room and resource reservations. |
| **Marketplace** | `8083` | Gamma | The school store for buying items. |
| **Exam** | `8084` | Delta | Manages exams and grades. |
| **Notification** | `8085` | Delta | Sends emails and SMS alerts. |

---

## 🔴 Team Alpha: Core & Auth
**Members**: [Name 1], [Name 2]
**Responsibility**: Gateway, Auth Backend, Login Frontend.

> **🎓 Concept: Microservices & Gateway**
> Imagine a large office building.
> - The **Gateway (Port 8080)** is the **Receptionist**. Users don't walk directly to the CEO's office; they go to the receptionist, who directs them to the right room.
> - The **Auth Service (Port 8081)** is the **Security Guard**. It checks ID cards (passwords) and issues Visitor Badges (JWT Tokens).

### 🤖 AI Prompts (Copy & Paste in Order)

#### Step 1: Backend - Auth Service (Port 8081)
> "I am building a Spring Boot Auth Service on port 8081. Package: `com.smartuniversity.auth`.
> 1. Create a `User` entity with ID (UUID), email (unique), password, fullName, and role (enum: STUDENT, INSTRUCTOR).
> 2. Create a `AuthController` with:
>    - `POST /api/auth/register`: Accepts email, password, name. Hashes password. Saves user. Publishes message to RabbitMQ exchange 'user-events' (key: 'user.registered') with JSON `{'userId': '...', 'email': '...'}`.
>    - `POST /api/auth/login`: Verifies password. Returns a JWT string with claims: sub=userId, role=role."

**🔍 Explanation of Terms:**
- **Entity**: A Java class that represents a table in our database. `User` entity = `Users` table.
- **UUID**: A random, unique ID (e.g., `123e4567-e89b...`) so we never have duplicate IDs.
- **Hash Password**: We never save plain passwords (like "123456"). We scramble them (hash) so hackers can't read them.
- **RabbitMQ**: A "Message Board". When a user registers, the Auth service posts a note ("New User!") on the board. Other services (like Notification) read this note and react (e.g., send a welcome email).
- **JWT (JSON Web Token)**: The "Visitor Badge". After logging in, the user gets this text string. They must show it (in the Header) for every future request to prove who they are.

#### Step 2: Backend - API Gateway (Port 8080)
> "I am building a Spring Cloud Gateway on port 8080.
> 1. Configure `application.yml` to route traffic:
>    - `/api/auth/**` -> `http://localhost:8081`
>    - `/api/bookings/**` -> `http://localhost:8082`
>    - `/api/store/**` -> `http://localhost:8083`
>    - `/api/exams/**` -> `http://localhost:8084`
> 2. Add a global CORS configuration to allow requests from `http://localhost:3000` (Frontend)."

**🔍 Explanation of Terms:**
- **Routing**: The map the Receptionist uses. "If they ask for `/api/auth`, send them to the Auth office (8081)."
- **CORS**: A security rule. Browsers block one website (localhost:3000) from talking to another (localhost:8080) by default. We must explicitly allow it.

#### Step 3: Frontend - Login Page
> "I am building a Next.js 14 Login page using Tailwind CSS.
> 1. Create a form with Email and Password fields.
> 2. On submit, call `POST http://localhost:8080/api/auth/login`.
> 3. If successful, save the received JWT token to localStorage and redirect to `/dashboard`."

---

## 🔵 Team Beta: Academic Resources
**Members**: [Name 3], [Name 4]
**Responsibility**: Booking Backend, Booking UI.

> **🎓 Concept: Optimistic Locking**
> Imagine two people try to book the last seat in a class at the exact same moment.
> - **Pessimistic Locking**: Locks the door so only one enters. Slow.
> - **Optimistic Locking**: Lets both try, but checks a "Version Number" before saving. If the version changed since they started reading, the second person fails and has to try again. It's faster and better for web apps.

### 🤖 AI Prompts (Copy & Paste in Order)

#### Step 1: Backend - Booking Service (Port 8082)
> "I am building a Spring Boot Booking Service on port 8082. Package: `com.smartuniversity.booking`.
> 1. Create `Resource` entity (id, name, type, capacity) and `Booking` entity (id, resourceId, userId, startTime, endTime).
> 2. Create `BookingController` with:
>    - `GET /api/bookings/resources`: Lists all resources.
>    - `POST /api/bookings`: Accepts resourceId, startTime, endTime. Extract userId from 'X-User-Id' header.
> 3. **Validation**: Before saving, query the DB to ensure no other booking overlaps with the requested time for that resource. Return 409 Conflict if occupied."

**🔍 Explanation of Terms:**
- **X-User-Id**: The Gateway extracts the User ID from the JWT badge and stamps it on the request header. This way, the Booking service knows WHO is asking, without needing to check the password again.

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

> **🎓 Concept: Saga Pattern**
> In a single app, if you buy something, we just save "Order" and subtract "Money" in one go (Transaction).
> In Microservices, "Order" is in one service and "Payment" might be in another. We can't save both instantly together.
> **Saga** is a chain reaction:
> 1. Service A: "Order Created!" (Sends event)
> 2. Service B: "I heard Order Created. I will try to process Payment." -> "Payment Failed!" (Sends event)
> 3. Service A: "I heard Payment Failed. I will Cancel the Order."
> It ensures data stays correct eventually.

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

> **🎓 Concept: Circuit Breaker**
> Just like a fuse in your house. If you plug in too many things, the fuse blows to prevent a fire.
> In software, if the Notification Service is broken and slow, the Exam Service shouldn't keep waiting for it forever and crash too.
> The **Circuit Breaker** "opens" (stops calling) the broken service and does something else (fallback), like logging an error, so the main system stays alive.

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

**🔍 Explanation of Terms:**
- **Feign Client**: A helper tool that makes calling other microservices as easy as calling a Java function.
- **Resilience4j**: A library that gives us the Circuit Breaker pattern.

#### Step 4: Frontend - Exam Dashboard
> "I am building a Next.js 14 Exam Dashboard.
> 1. Create a form to 'Create Exam' (Title, Date).
> 2. On submit, call `POST http://localhost:8080/api/exams`.
> 3. Show a success toast notification."
