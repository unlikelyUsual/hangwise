import { snapshotPrice, assertBookableWindow } from "./quote";

describe("snapshotPrice", () => {
  it("snapshots minor units and leaves the platform fee unknown by default", () => {
    const price = snapshotPrice({ hourlyRateMinor: 150_000, minutes: 120, currency: "THB", platformFeeBps: null });
    expect(price).toEqual({
      priceMinor: 300_000,
      currency: "THB",
      platformFeeMinor: null,
      feePolicy: "unknown",
      companionPayoutMinor: null,
    });
  });

  it("applies a fee only when basis points are configured", () => {
    const price = snapshotPrice({ hourlyRateMinor: 150_000, minutes: 120, currency: "THB", platformFeeBps: 1000 });
    expect(price.platformFeeMinor).toBe(30_000);
    expect(price.feePolicy).toBe("configured");
    expect(price.companionPayoutMinor).toBe(270_000);
  });

  it("rejects durations that are not 30 minute steps between 1 and 8 hours", () => {
    const start = new Date("2027-01-05T03:00:00.000Z");
    expect(() => assertBookableWindow(start, new Date(start.getTime() + 45 * 60_000))).toThrow(/30 minute/);
    expect(() => assertBookableWindow(start, new Date(start.getTime() + 30 * 60_000))).toThrow(/1 and 8 hours/);
    expect(() => assertBookableWindow(start, new Date(start.getTime() + 9 * 60 * 60_000))).toThrow(/1 and 8 hours/);
    expect(assertBookableWindow(start, new Date(start.getTime() + 90 * 60_000))).toBe(90);
  });
});
