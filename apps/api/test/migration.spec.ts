import { readdirSync, readFileSync } from "fs";
import path from "path";

describe("booking exclusion migration", () => {
  const migrations = path.resolve(__dirname, "../prisma/migrations");
  const sql = readdirSync(migrations, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => readFileSync(path.join(migrations, file), "utf8"))
    .join("\n");

  it("declares a partial GiST exclusion constraint for accepted and hold bookings", () => {
    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS btree_gist");
    expect(sql).toContain("CONSTRAINT \"bookings_active_no_overlap\"");
    expect(sql).toContain("EXCLUDE USING gist");
    expect(sql).toContain("'accepted'::\"booking_status\"");
    expect(sql).toContain("'hold'::\"booking_status\"");
    expect(sql).not.toContain("'requested'::\"booking_status\"");
  });
});
