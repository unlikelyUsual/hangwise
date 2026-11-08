# Data dictionary

This is the shape of the demo database. It is not a claim that the product is compliant with Thailand's PDPA, India's DPDP, or any app-store rule. See [privacy-and-legal-caveats.md](privacy-and-legal-caveats.md).

## users

Account row. `role` is `customer`, `companion`, or `admin` (one role in this skeleton). `is_demo` marks fixture people. `deleted_at` exists for a future deletion flow and is unused. Email is unique. Seed emails use the `.invalid` TLD.

## user_private_profiles

Split from the public companion profile so discovery queries do not select a phone number. Columns: optional `phone_e164`, `locale`, optional `country_code`, optional `terms_accepted_at`, optional `privacy_accepted_at`. The seed writes nulls for phone and consent. No endpoint returns this table.

## companion_profiles

Public listing. `status` is `draft`, `listed`, `paused`, or `suspended`. Discovery returns `listed` only. `age_years` is checked `>= 21` and `<= 120` and is still unverified. `hourly_rate_minor` must be positive. `currency` is `varchar(3)`. `languages` is a text array. `boundaries` is public copy.

## availability

UTC start and end for a companion. Rows cannot overlap for the same companion (`availability_no_overlap`). Seeded blocks are 10:00–18:00 Asia/Bangkok.

## bookings

Lifecycle: `requested`, `accepted`, `hold`, `expired`, `declined`, `cancelled`, `completed`.

| Column | Meaning |
| --- | --- |
| customer_id | The requesting user |
| companion_profile_id | The public profile, not the user id |
| venue_name, venue_area | Public meeting place. Not checked against a map |
| starts_at, ends_at | Half-open window, `ends_at > starts_at` |
| price_minor, currency | Immutable snapshot for this request |
| platform_fee_minor, fee_policy | `unknown` and null, or `configured` with a non-negative fee no larger than the price |
| hold_expires_at | Set only for `hold` |
| accepted_at, declined_at, cancelled_at, completed_at, expired_at, cancelled_by_user_id | Transition stamps |

Active overlap is enforced by `bookings_active_no_overlap` for `accepted` and `hold` only.

## idempotency_records

Unique `(actor_user_id, idempotency_key)` plus the request hash and the JSON response that was stored. A replay does not create a second booking.

## conversations, conversation_members, messages

One conversation per booking in this skeleton. Members are the customer and the companion user. Messages are text, 1–2000 characters. No attachments, no read receipts, no push.

## payments, refunds, payouts

`payments.booking_id` is unique. Status can be `unavailable`, `not_started`, `pending`, `authorized`, `captured`, `failed`, `refunded`, or `cancelled`. This code only writes `unavailable` / provider `unconfigured`. `external_reference` is an opaque processor id, null in the seed. No card or bank fields exist. Refunds and payouts are tables for later processors. Payout status includes `not_configured`. The seed does not insert payout or refund rows.

## verification_references

`kind`, `provider`, `status`, optional `external_reference`. Status includes `unavailable`. There is no document number, image, or government id column.

## webhook_events

Unique `(provider, external_event_id)` and a payload hash. The table is empty until a processor exists. The integration test inserts a duplicate and expects a unique violation, then rolls back.

## reports, blocks, check_ins, reviews, audit_logs

- reports: reporter, optional subject, optional booking, category `policy|safety|other`, body, status `open|closed`. No admin review UI.
- blocks: composite primary key, cannot block yourself.
- check_ins: a note on a booking. `monitored` is constrained to false.
- reviews: one per `(booking_id, author_user_id)`, rating 1–5, only after `completed` in the API. `verified` is not a column; the API always returns `verified: false`.
- audit_logs: actor, action, entity, JSON metadata. Report audits store the category, not the report body.

## Access

Customers read their bookings. Companions read bookings for their profile. Admins read all bookings and the audit log. Messages are limited to conversation members; admin message access is not implemented. Companion discovery is public and omits email and phone. `GET /v1/me` returns the signed-in demo user's email.
