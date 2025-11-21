# Exam & Notification Architecture

## 1. Purpose

Define how the Exam Service and Notification Service collaborate, and how the Circuit Breaker pattern is applied between them.

---

## 2. Exam Domain Model

### 2.1 Exam

| Field        | Type      | Description                                  |
|-------------|-----------|----------------------------------------------|
| `id`        | UUID/int  | Unique exam identifier                        |
| `tenantId`  | string    | Tenant/faculty ID                             |
| `instructorId` | string | Creator of the exam (from JWT `sub`)         |
| `title`     | string    | Exam title                                   |
| `description` | string  | Optional description                         |
| `startTime` | datetime  | Scheduled start time                         |
| `durationMin` | int     | Duration in minutes                          |
| `status`    | enum      | `DRAFT`, `SCHEDULED`, `ACTIVE`, `CLOSED`     |

### 2.2 ExamSession

| Field       | Type      | Description                                   |
|-------------|-----------|-----------------------------------------------|
| `id`        | UUID/int  | Unique session ID                             |
| `examId`    | UUID/int  | FK to Exam                                    |
| `studentId` | string    | Student’s user ID                             |
| `status`    | enum      | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`    |
| `startedAt` | datetime  | When student started                          |
| `finishedAt`| datetime  | When student finished                         |

---

## 3. Notification Domain Model

### 3.1 Notification

| Field         | Type      | Description                                  |
|---------------|-----------|----------------------------------------------|
| `id`          | UUID/int  | Notification ID                              |
| `tenantId`    | string    | Tenant/faculty ID                            |
| `recipientId` | string    | User ID or external address                  |
| `type`        | string    | `EMAIL`, `SMS`, `IN_APP`, `LOG`              |
| `subject`     | string    | Short subject                                |
| `message`     | string    | Body content                                 |
| `status`      | enum      | `QUEUED`, `SENT`, `FAILED`                   |
| `createdAt`   | datetime  | Creation time                                |

---

## 4. Use Cases

### 4.1 Create Exam

- Endpoint: `POST /exam/exams`
- Flow:
  1. Instructor (role `INSTRUCTOR`) sends request.
  2. Exam Service validates role and tenant.
  3. Creates Exam with status `DRAFT` or `SCHEDULED`.

### 4.2 Start Exam (with Notification & Circuit Breaker)

- Endpoint: `POST /exam/exams/{id}/start`
- Flow:
  1. Instructor or scheduled job triggers start.
  2. Exam Service:
     - Validates that the exam belongs to the instructor’s tenant.
     - Sets exam status to `ACTIVE`.
  3. Exam Service attempts to notify students:
     - Calls Notification Service (`POST /notifications`) or publishes an event.
     - This call is wrapped in a **Circuit Breaker**.

### 4.3 Student Joins Exam

- Endpoint: `POST /exam/exams/{id}/join`
- Flow:
  1. Student sends request with JWT.
  2. Exam Service checks:
     - Exam status is `ACTIVE`.
     - Student belongs to the same tenant.
  3. Creates `ExamSession` with `IN_PROGRESS`.

---

## 5. Circuit Breaker between Exam and Notification

### 5.1 Purpose

- Protect Exam Service from being blocked or failing when Notification Service is slow or unavailable.
- Ensure core exam logic still works even if notifications cannot be sent.

### 5.2 States

- **Closed**:
  - All calls go through.
  - Failures are counted.
- **Open**:
  - Calls are rejected immediately; fallback is executed.
- **Half-Open**:
  - After some time, allow limited test calls to check if Notification has recovered.

### 5.3 Failure Conditions

- Notification Service call times out.
- Multiple consecutive 5xx responses (e.g., 500, 503).
- Network errors.

When failure count crosses a configured threshold, the breaker transitions from **Closed** to **Open**.

### 5.4 Fallback Behavior (when Open)

- Exam Service:
  - Logs a warning that notifications are skipped.
  - Optionally enqueues a message or publishes `exam.notification.failed` event for later analysis.
- Exams continue starting; exam sessions proceed as normal.
- This satisfies the requirement that optional services should not break critical flows.

---

## 6. Notification Service Responsibilities

- Accept send-notification requests:
  - `POST /notifications`
- For prototype:
  - Log or store notifications instead of integrating with real email/SMS.
- Optionally:
  - Subscribe to `exam.started` events from a message broker instead of direct HTTP.

---

## 7. NFRs

- **Reliability**:
  - Circuit Breaker prevents cascading failures from Notification to Exam.
- **Security**:
  - Only authorized roles (instructors) can start exams.
  - JWT and tenant checks are enforced.
- **Maintainability**:
  - Circuit Breaker is localized in Exam Service and documented here.

---

## 8. Future Enhancements

- Retry mechanisms for failed notifications.
- Multiple channels per notification (email + SMS).
- Detailed monitoring (metrics, dashboards) for Circuit Breaker state.
