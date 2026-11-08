export class DomainError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = status;
  }
}

export function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as { code?: string; message?: string; cause?: unknown; meta?: { cause?: unknown } };
    if (record.code === "23505" || record.code === "P2002") return true;
    if (typeof record.message === "string" && record.message.includes("Unique constraint")) return true;
    current = record.cause ?? record.meta?.cause;
  }
  return false;
}

export function isExclusionViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as { code?: string; message?: string; cause?: unknown; meta?: { cause?: unknown } };
    if (record.code === "23P01") return true;
    const message = record.message ?? "";
    if (message.includes("23P01") || message.includes("bookings_active_no_overlap")) return true;
    current = record.cause ?? record.meta?.cause;
  }
  return false;
}
