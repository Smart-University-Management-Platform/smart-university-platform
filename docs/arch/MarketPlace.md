# Marketplace Service Architecture

## 1. Purpose

Marketplace Service provides:

- Management of **products** offered by tenants (faculties/vendors).
- **Shopping cart** for users.
- **Order** creation and payment simulation.
- Implementation of the **Saga** pattern around the order lifecycle.

---

## 2. Domain Model

### 2.1 Product

| Field        | Type      | Description                              |
|-------------|-----------|------------------------------------------|
| `id`        | UUID/int  | Unique product ID                        |
| `tenantId`  | string    | Tenant/faculty that owns this product    |
| `name`      | string    | Product name                             |
| `description` | string  | Optional description                     |
| `price`     | decimal   | Price per unit                           |
| `stock`     | int       | Available quantity                       |
| `active`    | boolean   | Whether this product can be purchased    |

### 2.2 Cart

| Field      | Type      | Description                      |
|-----------|-----------|----------------------------------|
| `id`      | UUID/int  | Cart ID                          |
| `userId`  | string    | Owner user ID (JWT `sub`)        |
| `tenantId`| string    | Tenant/faculty context           |

### 2.3 CartItem

| Field      | Type      | Description                      |
|-----------|-----------|----------------------------------|
| `cartId`  | UUID/int  | FK to Cart                       |
| `productId`| UUID/int | FK to Product                    |
| `quantity`| int       | Requested quantity               |

### 2.4 Order

| Field        | Type      | Description                                 |
|-------------|-----------|---------------------------------------------|
| `id`        | UUID/int  | Order ID                                    |
| `userId`    | string    | Buyer user ID                               |
| `tenantId`  | string    | Tenant/faculty context                      |
| `totalPrice`| decimal   | Total price at checkout                     |
| `status`    | enum      | `PENDING`, `PAID`, `FAILED`, `CANCELLED`    |
| `createdAt` | datetime  | Creation time                               |

### 2.5 OrderItem

| Field       | Type      | Description                      |
|------------|-----------|----------------------------------|
| `orderId`  | UUID/int  | FK to Order                      |
| `productId`| UUID/int  | FK to Product                    |
| `quantity` | int       | Quantity ordered                 |
| `unitPrice`| decimal   | Price per unit at time of order  |

---

## 3. Use Cases

### 3.1 Tenant Creates Product (FR-05)

- Endpoint: `POST /marketplace/products`
- Only users with role `TENANT_ADMIN` for the given `tenantId` can create products.
- Data includes name, price, stock, metadata.

### 3.2 User Adds Product to Cart

- Endpoint: `POST /marketplace/cart/items`
- Uses JWT to identify user and tenant.
- Adds or updates a CartItem in the user’s cart.

### 3.3 User Views Cart

- Endpoint: `GET /marketplace/cart`
- Shows items and computed total price (client-side or server-side).

### 3.4 User Checks Out (FR-06, Saga)

- Endpoint: `POST /marketplace/orders`
- Start of the **Saga**:
  1. Validate that cart is not empty.
  2. Compute `totalPrice`.
  3. Create Order with `PENDING` status.
  4. Reserve inventory:
     - Decrement product stock.
  5. Simulate payment with Payment Provider.
  6. If payment succeeds:
     - Set Order status to `PAID`.
  7. If payment fails:
     - Restore stock.
     - Set Order status to `CANCELLED`.

---

## 4. Saga Pattern

### 4.1 Orchestrator Approach

Marketplace acts as an orchestrator:

1. `OrderCreated` event: published when order is created.
2. `InventoryReserved` or `InventoryFailed` events:
   - If inventory failed → orchestrator triggers compensation / cancellation.
3. `PaymentCompleted` or `PaymentFailed` events:
   - If payment failed → orchestrator triggers compensation / cancellation.
4. Final event `OrderConfirmed` or `OrderCancelled`.

This can start simple (some steps done synchronously in one service) and then be split across events and microservices as the implementation matures.

---

## 5. API Summary

Base path: `/marketplace`

- `POST /products`
  - Create new product (tenant admin).
- `GET /products`
  - List products for current tenant.
- `POST /cart/items`
  - Add a product to the user’s cart.
- `GET /cart`
  - View current cart.
- `POST /orders`
  - Start checkout Saga.
- `GET /orders/{id}`
  - Get order status.

---

## 6. Multi-Tenancy

- All entities (`Product`, `Cart`, `Order`) are scoped by `tenantId`.
- Queries and updates must include `tenantId = <from JWT>` to avoid data leakage.
- This matches the multi-tenancy ADR.

---

## 7. NFRs

- **Scalability**:
  - Marketplace can scale horizontally; Saga orchestrator works with events and broker.
- **Reliability**:
  - Saga ensures eventual consistency between inventory and orders.
- **Multi-Tenancy**:
  - Per-tenant separation of products, carts, and orders.
- **Performance**:
  - Product listing is cache-friendly; orders are write-intensive but short-lived.

---

## 8. Future Enhancements

- Real payment integration.
- Discount/coupon support.
- Integration with Notification Service for order confirmations.
