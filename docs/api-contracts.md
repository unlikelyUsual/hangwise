# API contracts

The running description is `GET /openapi.json` and `GET /docs`. A generated copy is [openapi.json](openapi.json).

Errors look like:

```json
{ "error": { "code": "BOOKING_CONFLICT", "message": "...", "requestId": "..." } }
```

Validation errors use code `VALIDATION` and a `details` array. Responses include `X-Hangwise-Demo: true`.

## Public

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | `demoMode`, `payments: disabled`, `verification: unavailable`, auth mode, fee policy |
| GET | `/health/ready` | `SELECT 1`. 503 `NOT_READY` when Postgres is down. Does not include the driver error |
| GET | `/v1/companions?city=` | Listed profiles. `ageVerified` and `identityVerified` are false |
| GET | `/v1/companions/:id` | 404 unless listed |
| GET | `/v1/companions/:id/availability` | Windows labeled in Asia/Bangkok |
| GET | `/v1/safety/policy` | Product rules for the demo, not a legal opinion |

## Development auth required

Headers `X-Hangwise-Dev-User` and `X-Hangwise-Dev-Secret`.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/v1/me` | Signed-in demo user. No private phone |
| POST | `/v1/bookings` | Idempotency-Key required. 201 with price snapshot and `paymentAuthorized: false` |
| GET | `/v1/bookings` | Own rows, or all rows for admin |
| GET | `/v1/bookings/:id` | 404 when the caller is not a participant |
| POST | `/v1/bookings/:id/accept` | Companion or admin. 409 on overlap or a bad transition |
| POST | `/v1/bookings/:id/decline` | From `requested` |
| POST | `/v1/bookings/:id/hold` | `{ "holdMinutes": 15-120 }` from `accepted`. No charge |
| POST | `/v1/bookings/:id/cancel` | Customer, companion, or admin, with the rules in the architecture doc |
| POST | `/v1/bookings/:id/complete` | From `accepted` only |
| GET | `/v1/payments/booking/:bookingId` | The unavailable payment row. `charged` is false unless status is `captured`, which this API never writes |
| POST | `/v1/payments/checkout` | 501 `PAYMENTS_UNAVAILABLE`. Extra fields such as a card number are 400 and are not echoed back |
| GET | `/v1/verification/me` | `collectsGovernmentId: false` |
| POST | `/v1/verification/start` | 501. Do not send documents |
| GET | `/v1/conversations` | Member only |
| GET/POST | `/v1/conversations/:id/messages` | Member only. Blocked pairs cannot post |
| POST | `/v1/safety/reports` | Stored. `reviewSla: none`, `monitored: false` |
| POST | `/v1/safety/blocks` | |
| POST | `/v1/safety/check-ins` | Response forces `monitored: false` and `emergencyService: false` |
| GET | `/v1/safety/check-ins?bookingId=` | Participants only |
| GET/POST | `/v1/reviews` | Participant, completed booking, `verified: false` |
| GET | `/v1/admin/audit-logs?limit=` | Admin role only |

There is no upload route. The storage seam throws `STORAGE_UNAVAILABLE` if called.
