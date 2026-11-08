# ER diagram

Identifiers are UUIDs. Timestamps are `timestamptz` and meant to be UTC. Money is an integer of minor units plus a 3-letter currency. The partial exclusion constraint on bookings is drawn as a note because it is not a foreign key.

```mermaid
erDiagram
  users ||--o| user_private_profiles : has
  users ||--o| companion_profiles : publishes
  companion_profiles ||--o{ availability : offers
  users ||--o{ bookings : requests
  companion_profiles ||--o{ bookings : receives
  bookings ||--o| payments : snapshots
  payments ||--o{ refunds : may_have
  companion_profiles ||--o{ payouts : may_have
  bookings ||--o| conversations : opens
  conversations ||--o{ conversation_members : includes
  users ||--o{ conversation_members : joins
  conversations ||--o{ messages : contains
  users ||--o{ messages : sends
  bookings ||--o{ check_ins : notes
  bookings ||--o{ reviews : may_have
  users ||--o{ reports : files
  users ||--o{ blocks : makes
  users ||--o{ verification_references : status_only
  users ||--o{ idempotency_records : replays
  users ||--o{ audit_logs : acts
  webhook_events {
    string provider
    string external_event_id
  }
```

`bookings` also has `EXCLUDE USING gist` on `(companion_profile_id, tstzrange(starts_at, ends_at, '[)'))` where status is `accepted` or `hold`. `availability` has the same exclusion without a status filter. `webhook_events` is unique on `(provider, external_event_id)`. `idempotency_records` is unique on `(actor_user_id, idempotency_key)`.

See [data-dictionary.md](data-dictionary.md) for columns and the checks that are not in the diagram.
