-- Accepted and hold bookings cannot overlap for the same companion.
-- Requested, declined, cancelled, expired, and completed rows stay out of this
-- partial constraint so several customers can request one slot, and a cancellation
-- frees it. A hold is a scheduling lock only. It does not authorize a payment.
-- btree_gist lets uuid equality share a GiST index with tstzrange.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_time_order" CHECK ("ends_at" > "starts_at"),
  ADD CONSTRAINT "bookings_price_positive" CHECK ("price_minor" > 0),
  ADD CONSTRAINT "bookings_currency_code" CHECK (char_length("currency") = 3),
  ADD CONSTRAINT "bookings_fee_policy_shape" CHECK (
    ("fee_policy"::text = 'unknown' AND "platform_fee_minor" IS NULL)
    OR (
      "fee_policy"::text = 'configured'
      AND "platform_fee_minor" IS NOT NULL
      AND "platform_fee_minor" >= 0
      AND "platform_fee_minor" <= "price_minor"
    )
  );

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_active_no_overlap"
  EXCLUDE USING gist (
    "companion_profile_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" IN ('accepted'::"booking_status", 'hold'::"booking_status"));

ALTER TABLE "availability"
  ADD CONSTRAINT "availability_time_order" CHECK ("ends_at" > "starts_at");

ALTER TABLE "availability"
  ADD CONSTRAINT "availability_no_overlap"
  EXCLUDE USING gist (
    "companion_profile_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  );

ALTER TABLE "companion_profiles"
  ADD CONSTRAINT "companion_age_adult" CHECK ("age_years" >= 21 AND "age_years" <= 120),
  ADD CONSTRAINT "companion_rate_positive" CHECK ("hourly_rate_minor" > 0),
  ADD CONSTRAINT "companion_currency_code" CHECK (char_length("currency") = 3);

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);

ALTER TABLE "check_ins"
  ADD CONSTRAINT "check_ins_not_monitored" CHECK ("monitored" = false);

ALTER TABLE "blocks"
  ADD CONSTRAINT "blocks_not_self" CHECK ("blocker_user_id" <> "blocked_user_id");
