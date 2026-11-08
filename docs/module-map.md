# Module map

API modules live under `apps/api/src`.

| Module | Role in this skeleton |
| --- | --- |
| config | Boot-time env validation |
| prisma | Client and `pg` adapter |
| data | `HangwiseData` memory and Prisma implementations |
| auth | Development header guard |
| users | `GET /v1/me` |
| companions | Public discovery and availability |
| bookings | Request, lifecycle, price snapshot, conflicts |
| chat | Conversations and messages |
| payments | Read the unavailable row, refuse checkout |
| verification | Status only, refuse start |
| safety | Policy, reports, blocks, check-ins |
| reviews | After a completed booking |
| admin | Audit log for the admin role |
| providers | Payment, verification, notification, and storage seams |
| worker | `src/worker.ts` expires due holds once per invocation |

The Flutter app keeps routing in `lib/routing`, HTTP in `lib/data`, and screens under `lib/features`.
