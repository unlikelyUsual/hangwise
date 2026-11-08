# Implemented vs scaffold

## Implemented

- Flutter discovery, profile, booking request, booking list and detail, messages, account persona switch, and safety report screen, with loading, empty, and error states
- API health, readiness, OpenAPI, env validation, CORS, security headers, in-memory rate limit
- Development-only auth that fails closed otherwise, with server-side roles
- Companion list and detail, availability
- Booking create, list, get, accept, decline, hold, cancel, complete
- Price snapshot, idempotency, overlap checks, Postgres exclusion constraint
- Chat persistence, reports, blocks, check-ins, reviews after completion
- Payment, verification, notification, and storage seams that do not pretend to succeed
- Demo seed and audit rows
- One-shot worker that expires due holds

## Scaffold only

- No real auth vendor, session, or refresh token
- No KYC vendor and no document upload
- No card, wallet, refund, or payout execution
- No notification delivery and no websocket
- No retention or deletion job
- No admin web app
- No production process manager or cron for the worker
- No app-store binaries, signing, or HTTPS deployment

## Explicitly refused

`NODE_ENV=production` will not boot. `PAYMENTS_MODE` cannot be set to anything but `disabled`. `VERIFICATION_MODE` cannot be set to anything but `unavailable`. `DEMO_MODE` must be `true`.
