# Privacy and legal caveats

This note is not legal advice and not a compliance claim. A foreign founder intending to operate in Thailand, with a possible later India launch, still needs local counsel before collecting personal data, taking payment, or listing on an app store. Payment-provider approval, marketplace licensing, and store review are unresolved. Do not point this skeleton at real people or real money.

## What the demo stores

Seeded users are fictional adults with `@demo.hangwise.invalid` emails. Companion profiles store a display name, an unverified age of 21 or older, city, area, languages, a public bio, and an hourly rate. Bookings store the public venue, the time window, the price snapshot, and an optional note. Messages, reports, blocks, check-in notes, and reviews are rows the API writes when those endpoints are called.

## What it does not store

No card numbers, bank accounts, or payout destination details. No government id numbers, document images, selfies, or biometric templates. Verification is a status and an optional external reference only. The private profile table can hold a phone number and consent timestamps, and the seed leaves those null. No endpoint reads that table.

## Access

The signed-in demo user can read their own account email. The other party on a booking can read the booking and the shared conversation, not the other person's private profile. Admin can read bookings and the audit log. Admin cannot read messages unless they are a member, which the seed does not do. Discovery responses omit email and phone.

## Consent, retention, deletion

`terms_accepted_at` and `privacy_accepted_at` exist and are null. There is no consent screen, no retention job, and no deletion workflow. `users.deleted_at` is unused. Saying the schema has a column is not the same as honoring an erasure or access request.

## Safety copy

The product rule in the API and the app is that a booking is paid time in public, not a sexual service and not a romantic entitlement. Check-in rows are constrained so `monitored` cannot be true. The API tells the client `emergencyService: false`. There is no SOS vendor and no promise that anyone will respond.

## Age

The database rejects companion ages under 21. The API still marks `ageVerified: false`. The ages in the seed are fiction.

## Payments

Checkout cannot succeed. A hold is a calendar state. No take rate is assumed. If `PLATFORM_FEE_BPS` is unset, the fee is `unknown`.
