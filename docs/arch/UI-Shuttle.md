# UI & Shuttle Architecture

## 1. UI Overview

The UI provides separate but connected flows for:

- Login/registration.
- Resource browsing and booking.
- Marketplace shopping and checkout.
- Exam listing and participation.
- IoT sensor dashboard.
- Shuttle location map.

The UI communicates exclusively through the API Gateway using HTTP requests with JWT tokens for authentication.

---

## 2. Planned Screens

### 2.1 Login / Register Screen

- Fields:
  - Email
  - Password
  - (Registration only) Name, tenant/faculty, role (if allowed)
- Behavior:
  - On login:
    - Call `POST /auth/login`.
    - If successful, store JWT (e.g., local storage).
  - On register:
    - Call `POST /auth/register`.
    - Optionally redirect to login after success.

### 2.2 Dashboard Screen

- After login, user sees:
  - Links to:
    - Resources/Booking
    - Marketplace
    - Exams
    - IoT Dashboard
    - Shuttle Map
- Optionally display quick status (e.g., upcoming bookings or exams).

### 2.3 Resources & Booking Screen

- Uses:
  - `GET /booking/resources` to list resources.
  - `POST /booking/bookings` to create bookings.
- UI elements:
  - List/table of resources with name, type, location.
  - Date/time selector for booking.
  - Status messages for booking success/failure (overbooking).

### 2.4 Marketplace Screen

- Uses:
  - `GET /marketplace/products` to display products.
  - `POST /marketplace/cart/items` to add items.
  - `GET /marketplace/cart` to view cart.
  - `POST /marketplace/orders` to checkout.
- UI elements:
  - Product cards/list (name, price, stock).
  - Cart side panel or page with total price.
  - Checkout button showing status of Saga (pending/paid/cancelled).

### 2.5 Exams Screen

- Instructor view:
  - Form to create new exam.
  - Button to start exam.
- Student view:
  - List of available exams.
  - “Join exam” button.
- Uses:
  - `POST /exam/exams`
  - `GET /exam/exams`
  - `POST /exam/exams/{id}/start`
  - `POST /exam/exams/{id}/join`

### 2.6 IoT Dashboard Screen

- Uses:
  - `GET /iot/sensors/{id}/latest`
- UI elements:
  - Numeric display (e.g., 23.5 °C).
  - Simple graph or last N readings (optional).
- Behavior:
  - Poll every few seconds for updated readings.

### 2.7 Shuttle Map Screen

- Uses:
  - `GET /shuttle/location`
- UI elements:
  - Map (or static image) showing campus.
  - Marker indicating shuttle position.
- Behavior:
  - Poll every few seconds and move the marker.

---

## 3. Shuttle Service

### 3.1 Simulation Logic

- Maintain a sequence/list of coordinates describing a route around campus.
- Background job periodically:
  - Moves an index pointer along this list.
  - When end is reached, loops or reverses direction.

### 3.2 API

- `GET /shuttle/location`
  - Response:

```json
{
  "lat": 35.7002,
  "lng": 51.4002,
  "timestamp": "2025-11-20T10:02:00Z"
}
