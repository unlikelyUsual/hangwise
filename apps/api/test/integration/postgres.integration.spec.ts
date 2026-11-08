import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://hangwise:hangwise@127.0.0.1:5433/hangwise";

describe("PostgreSQL booking constraints", () => {
  const client = new Client({ connectionString: databaseUrl });

  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it("rejects overlapping accepted bookings, allows overlapping requests, and unique webhook ids", async () => {
    const customer = "99999999-9999-4999-8999-999999999991";
    const companionUser = "99999999-9999-4999-8999-999999999992";
    const profile = "99999999-9999-4999-8999-999999999993";
    const acceptedA = "99999999-9999-4999-8999-999999999994";
    const acceptedB = "99999999-9999-4999-8999-999999999995";
    const requestedA = "99999999-9999-4999-8999-999999999996";
    const requestedB = "99999999-9999-4999-8999-999999999997";
    await client.query("BEGIN");
    try {
      const constraint = await client.query(
        "SELECT conname FROM pg_constraint WHERE conname IN ('bookings_active_no_overlap', 'availability_no_overlap')",
      );
      expect(constraint.rows.map((row: { conname: string }) => row.conname).sort()).toEqual([
        "availability_no_overlap",
        "bookings_active_no_overlap",
      ]);

      await client.query(
        `INSERT INTO users (id, email, display_name, role, is_demo, created_at, updated_at) VALUES
         ($1, 'overlap-customer@demo.hangwise.invalid', 'Overlap Customer', 'customer', true, now(), now()),
         ($2, 'overlap-companion@demo.hangwise.invalid', 'Overlap Companion', 'companion', true, now(), now())`,
        [customer, companionUser],
      );
      await client.query(
        `INSERT INTO companion_profiles (
           id, user_id, public_name, age_years, headline, bio, city, area, status,
           hourly_rate_minor, currency, languages, boundaries, created_at, updated_at
         ) VALUES (
           $1, $2, 'Overlap Companion', 30, 'Demo', 'Fictional', 'Bangkok', 'Pathum Wan', 'listed',
           150000, 'THB', ARRAY['English'], 'Public places only', now(), now()
         )`,
        [profile, companionUser],
      );
      await client.query(
        `INSERT INTO bookings (
           id, customer_id, companion_profile_id, venue_name, venue_area, starts_at, ends_at,
           status, price_minor, currency, platform_fee_minor, fee_policy, updated_at
         ) VALUES (
           $1, $2, $3, 'Lumpini Park', 'Pathum Wan', '2027-03-01T03:00:00Z', '2027-03-01T05:00:00Z',
           'accepted', 300000, 'THB', NULL, 'unknown', now()
         )`,
        [acceptedA, customer, profile],
      );
      await client.query("SAVEPOINT before_conflict");
      await expect(
        client.query(
          `INSERT INTO bookings (
             id, customer_id, companion_profile_id, venue_name, venue_area, starts_at, ends_at,
             status, price_minor, currency, platform_fee_minor, fee_policy, updated_at
           ) VALUES (
             $1, $2, $3, 'Lumpini Park', 'Pathum Wan', '2027-03-01T04:00:00Z', '2027-03-01T06:00:00Z',
             'accepted', 300000, 'THB', NULL, 'unknown', now()
           )`,
          [acceptedB, customer, profile],
        ),
      ).rejects.toMatchObject({ code: "23P01" });
      await client.query("ROLLBACK TO SAVEPOINT before_conflict");
      await client.query(
        `INSERT INTO bookings (
           id, customer_id, companion_profile_id, venue_name, venue_area, starts_at, ends_at,
           status, price_minor, currency, platform_fee_minor, fee_policy, updated_at
         ) VALUES
         ($1, $2, $3, 'Lumpini Park', 'Pathum Wan', '2027-03-02T03:00:00Z', '2027-03-02T05:00:00Z', 'requested', 300000, 'THB', NULL, 'unknown', now()),
         ($4, $2, $3, 'Lumpini Park', 'Pathum Wan', '2027-03-02T04:00:00Z', '2027-03-02T06:00:00Z', 'requested', 300000, 'THB', NULL, 'unknown', now())`,
        [requestedA, customer, profile, requestedB],
      );
      await client.query(
        `INSERT INTO webhook_events (id, provider, external_event_id, payload_sha256, status)
         VALUES ('99999999-9999-4999-8999-999999999998', 'unconfigured', 'evt_demo_1', 'abc', 'ignored')`,
      );
      await client.query("SAVEPOINT before_webhook");
      await expect(
        client.query(
          `INSERT INTO webhook_events (id, provider, external_event_id, payload_sha256, status)
           VALUES ('99999999-9999-4999-8999-999999999999', 'unconfigured', 'evt_demo_1', 'def', 'ignored')`,
        ),
      ).rejects.toMatchObject({ code: "23505" });
      await client.query("ROLLBACK TO SAVEPOINT before_webhook");
    } finally {
      await client.query("ROLLBACK");
    }
  });
});
