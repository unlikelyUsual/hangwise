# Architecture

Hangwise is one modular monolith and a Flutter client. There are no microservices.

```text
apps/mobile  Flutter, Riverpod, go_router, http
    |
    |  JSON /v1
    v
apps/api     NestJS + Fastify
    |-- config validation (Zod)
    |-- dev auth guard, fail closed otherwise
    |-- rate limit (in-memory, per process)
    |-- modules: users, companions, bookings, chat,
    |            payments, verification, safety, reviews, admin
    |-- HangwiseData port
    |     |-- memory (tests and OpenAPI generation)
    |     \-- Prisma (development)
    v
PostgreSQL   Prisma migrations, plus a SQL exclusion constraint
apps/api/src/worker.ts   one-shot hold expiry, no scheduler installed
```

## Booking rules

- Only a customer can request a date, and only for themselves.
- The request must sit inside a published availability window, in 30-minute steps, from 1 to 8 hours, in the future.
- The price is an integer minor-unit snapshot of the listed hourly rate. The currency in this skeleton is THB.
- Several requests may overlap. Accept and hold recheck the window inside a transaction. Postgres also rejects overlapping `accepted` and `hold` rows for the same companion with a partial GiST exclusion constraint (`btree_gist`, half-open `tstzrange`).
- Idempotency-Key is required on create. The same key and body replay the stored booking. A different body is a conflict.
- A hold sets an expiry and does not authorize a payment. The worker can move due holds to `expired`. It does not run on a timer.
- Complete is allowed from `accepted` only. A hold cannot be completed while payments are disabled.
- Customers can cancel `requested`, `accepted`, or `hold`. Companions decline a request, and can cancel `accepted` or `hold`.

## Providers that are seams, not implementations

- `UnavailablePaymentProvider` throws `PAYMENTS_UNAVAILABLE` (501). Checkout never writes a captured charge. Booking rows get a payment record with status `unavailable` and provider `unconfigured`.
- `UnavailableVerificationProvider` throws `VERIFICATION_UNAVAILABLE`. The API does not accept identity documents.
- `RefusingObjectStorage` throws rather than storing a file.
- `UnconfiguredNotificationProvider` returns `{ delivered: false, reason: "not_configured" }`. Chat does not call it.

## Auth

`DevAuthGuard` runs only when `AUTH_MODE=development` and the process is `development` or `test`. It compares the shared demo secret in constant time and loads the user. Public routes are health, companion discovery, availability, the safety policy, and the OpenAPI pages. Everything else is 401 when auth is disabled, including if the demo headers are still sent.

CORS allows only origins listed in `CORS_ORIGINS`. An empty list does not reflect `*`.

The rate limit is a per-process memory map. It is a baseline, not a production control. Tests skip it.

## Why Prisma 7.10.1

Prisma 8 was an rc on the `latest` dist-tag when this skeleton was created. 7.10.1 is the last stable 7 release (`prev` tag). The client uses the `prisma-client` generator and the `pg` driver adapter. The exclusion constraint lives in SQL because the Prisma schema language cannot express `EXCLUDE USING gist`. Do not use `prisma db push`; it can drop that constraint. Use `prisma migrate deploy`.
