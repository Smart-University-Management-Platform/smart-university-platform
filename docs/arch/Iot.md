# IoT Service Architecture

## 1. Purpose

The IoT Service supports a **virtual sensor dashboard**:

- Simulates or receives readings from virtual sensors (e.g., classroom temperature).
- Stores sensor readings.
- Provides the **latest reading** for display on a dashboard.
- Its failure must not break core flows (Auth, Booking, Marketplace, Exams).

---

## 2. Domain Model

### 2.1 Sensor

| Field     | Type      | Description                                |
|-----------|-----------|--------------------------------------------|
| `id`      | string    | Sensor ID (e.g., `room-101-temperature`)   |
| `name`    | string    | Human-readable name                        |
| `type`    | string    | e.g., `TEMPERATURE`, `HUMIDITY`            |
| `tenantId`| string    | Tenant/faculty that owns the sensor        |

### 2.2 SensorReading

| Field       | Type      | Description               |
|-------------|-----------|---------------------------|
| `sensorId`  | string    | ID of the sensor          |
| `value`     | float     | Numeric value             |
| `timestamp` | datetime  | Reading time              |

---

## 3. Use Cases

### 3.1 Receive Sensor Reading

- Endpoint: `POST /iot/sensors/{id}/readings`
- Request example:

```json
{
  "value": 23.5
}
