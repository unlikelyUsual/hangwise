export function rateLimitDecision(
  hits: number[],
  now: number,
  windowMs: number,
  max: number,
): { allowed: boolean; next: number[] } {
  const fresh = hits.filter((timestamp) => now - timestamp < windowMs);
  if (fresh.length >= max) return { allowed: false, next: fresh };
  fresh.push(now);
  return { allowed: true, next: fresh };
}
