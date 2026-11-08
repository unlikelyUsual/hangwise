import { rateLimitDecision } from "./rate-limit";

describe("rateLimitDecision", () => {
  it("blocks once the window is full and forgets old hits", () => {
    const first = rateLimitDecision([], 1_000, 60_000, 2);
    const second = rateLimitDecision(first.next, 1_100, 60_000, 2);
    const third = rateLimitDecision(second.next, 1_200, 60_000, 2);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    const later = rateLimitDecision(third.next, 70_000, 60_000, 2);
    expect(later.allowed).toBe(true);
  });
});
