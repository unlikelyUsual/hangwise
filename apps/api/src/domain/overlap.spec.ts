import { rangesOverlap } from "./overlap";

describe("rangesOverlap", () => {
  const at = (hour: number) => new Date(Date.UTC(2027, 0, 5, hour));

  it("treats windows as half-open so a booking can start when another ends", () => {
    expect(rangesOverlap(at(10), at(12), at(12), at(14))).toBe(false);
    expect(rangesOverlap(at(10), at(12), at(8), at(10))).toBe(false);
  });

  it("detects partial overlap", () => {
    expect(rangesOverlap(at(10), at(12), at(11), at(13))).toBe(true);
  });
});
