import { readFileSync } from "fs";
import path from "path";

describe("demo persona ids", () => {
  it("keeps the mobile persona ids aligned with the API fixtures", () => {
    const api = readFileSync(path.resolve(__dirname, "../src/demo/personas.ts"), "utf8");
    const mobile = readFileSync(path.resolve(__dirname, "../../mobile/lib/demo/personas.dart"), "utf8");
    const ids = [...api.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g)].map((match) => match[0]);
    expect(ids.length).toBe(7);
    for (const id of ids) expect(mobile).toContain(id);
  });
});
