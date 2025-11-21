# Booking Service Architecture

## 1. Purpose & Responsibilities

The Booking Service is responsible for:

- Managing bookable **resources** (rooms, labs, etc.).
- Allowing users to **view resources** for their tenant (FR-03).
- Allowing users to **create bookings** for specific time intervals (FR-04).
- **Preventing overbooking** (no two bookings on the same resource at overlapping times).
- Respecting **multi-tenancy** by isolating data with `tenantId`.

---

## 2. Domain Model

### 2.1 Resource

| Field       | Type      | Description                                         |
|------------|-----------|-----------------------------------------------------|
| `id`       | UUID/int  | Unique resource ID                                  |
| `tenantId` | string    | Tenant/faculty ID that owns the resource            |
| `name`     | string    | Human-readable name (e.g., "Room A-101")            |
| `type`     | string    | Resource type (`STUDY_ROOM`, `LAB`, `HALL`, etc.)   |
| `location` | string    | Physical location                                   |
| `capacity` | int       | Max people/seats (optional)                         |
| `metadata` | JSON      | Optional additional details                         |

### 2.2 Booking

| Field        | Type      | Description                                                 |
|-------------|-----------|-------------------------------------------------------------|
| `id`        | UUID/int  | Unique booking ID                                           |
| `resourceId`| UUID/int  | Resource being booked                                       |
| `tenantId`  | string    | Tenant/faculty ID (same as the resource’s tenant)          |
| `userId`    | string    | ID of the user who created the booking                     |
| `startTime` | datetime  | Booking start time                                         |
| `endTime`   | datetime  | Booking end time                                           |
| `status`    | enum      | `PENDING`, `CONFIRMED`, `CANCELLED`                         |
| `createdAt` | datetime  | Time booking was created                                   |

> In later phases, you can add discrete timeslots with a `timeslotId` and enforce uniqueness on `(resourceId, timeslotId)`.

---

## 3. Core Use Cases

### 3.1 List Resources (FR-03)

1. Client sends `GET /booking/resources` with JWT.
2. Booking Service:
   - Extracts `tenantId` from JWT.
   - Returns all resources where `tenantId` matches.
3. Optional:
   - Filter by type or search term.
   - Cache the result for performance.

### 3.2 Create Booking (FR-04)

1. Client sends `POST /booking/bookings` with:
   - `resourceId`
   - `startTime`
   - `endTime`
2. Booking Service:
   - Extracts `userId` and `tenantId` from JWT.
   - Validates that the resource belongs to the same `tenantId`.
   - Checks for **overlapping bookings** for that resource and tenant:
     - Overlap logic (simplified):
       - An existing booking overlaps if:
         - `existing.startTime < new.endTime` AND
         - `existing.endTime > new.startTime`
   - If overlapping booking exists:
     - Return `409 Conflict`.
   - Otherwise:
     - Create booking with status `CONFIRMED` (or `PENDING`).
3. For later:
   - Consider DB-level constraints or locking for stronger guarantees.

### 3.3 List My Bookings

1. Client sends `GET /booking/bookings/my` with JWT.
2. Booking Service:
   - Extracts `userId` and `tenantId`.
   - Returns all bookings where both `userId` and `tenantId` match.

---

## 4. API Endpoints (Planned Structure)

Base path: `/booking`

- `GET /resources`
  - List all resources for the current tenant.
- `POST /resources`
  - Create a resource (restricted to `TENANT_ADMIN` or similar).
- `POST /bookings`
  - Create a booking (requires authenticated user).
- `GET /bookings/my`
  - Get bookings of the currently logged-in user.

---

## 5. Multi-Tenancy

- Every `Resource` and `Booking` row contains `tenantId`.
- All queries:
  - Must include `tenantId = <from JWT>`.
- This ensures no user from one tenant can see or manipulate data of another.

---

## 6. Overbooking & Consistency

Current strategy (Phase 2, then improved later):

1. **Application-level check** before inserting:
   - Query for overlapping bookings.
   - If any, reject the new booking.
2. Later, **DB-level support**:
   - Timeslot model or stronger isolation / locking.
3. Documented in ADR-0005 (anti-overbooking and consistency).

---

## 7. NFR Support

- **Reliability (NFR-R02)**:
  - Overbooking prevention implemented at application and later at DB level.
- **Performance (NFR-P01)**:
  - `GET /resources` is a good candidate for caching.
- **Multi-Tenancy (NFR-MT01)**:
  - `tenantId` is mandatory for resources and bookings.
- **Security**:
  - Booking endpoints require valid JWT; privileges derive from user’s `roles`.

---

## 8. Future Extensions

- Cancellation rules and penalties.
- Waitlists for fully booked resources.
- Notification hooks (e.g., email when booking is created or cancelled).
