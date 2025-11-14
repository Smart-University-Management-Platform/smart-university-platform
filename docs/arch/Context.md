# C4 – Level 1: System Context

## Purpose

This diagram shows who interacts with the **Smart University Management Platform** and which external systems it depends on.

## Primary Actors

- **Student**
  - Registers and logs in.
  - Books shared resources (rooms, labs, etc.).
  - Buys products/tickets in the marketplace.
  - Takes online exams and receives notifications.

- **Instructor**
  - Creates exams and learning content.
  - Manages exam sessions.
  - May manage certain resources (e.g., lab time).

- **Tenant Admin (Faculty / Vendor Admin)**
  - Manages users belonging to a faculty/vendor.
  - Manages products/events in the marketplace.
  - Manages reservable resources (rooms, labs, equipment).

## External Systems

- **Payment Provider**
  - Processes payments for marketplace orders.

- **Map / Geocoding Service**
  - Used by the shuttle tracking module and campus maps.

- **Email / SMS Provider**
  - Used by the Notification service to deliver messages to end users.

## The System

- **Smart University Management Platform**
  - A microservices-based backend behind a single API Gateway.
  - Exposes APIs for authentication, booking, marketplace, exams, notifications, IoT, and shuttle tracking.
  - Enforces multi-tenancy so multiple faculties/vendors can share the platform safely.

## Context Relationships (Text Sketch)

```text
+-------------------+        +-------------------------------------------+
|      Student      |        |              Instructor                   |
+-------------------+        +-------------------------------------------+
           \                                /
            \                              /
             v                            v
               [ Web / Mobile Client Applications ]
                              |
                              v
                  [ API Gateway / Smart University
                          Management Platform ]
                              |
        +---------------------+-------------------------+
        |                     |                         |
        v                     v                         v
 [ Payment Provider ]   [ Map / Geocoding ]   [ Email / SMS Provider ]
