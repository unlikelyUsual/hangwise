import { DomainError } from "./errors";
import type { FeePolicy } from "./types";

const MINUTE_MS = 60_000;

export function assertBookableWindow(startsAt: Date, endsAt: Date): number {
  const durationMs = endsAt.getTime() - startsAt.getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new DomainError("INVALID_WINDOW", "The date must end after it starts.", 422);
  }
  if (durationMs % (30 * MINUTE_MS) !== 0) {
    throw new DomainError("INVALID_WINDOW", "Book time in 30 minute steps.", 422);
  }
  const minutes = durationMs / MINUTE_MS;
  if (minutes < 60 || minutes > 8 * 60) {
    throw new DomainError("INVALID_WINDOW", "A public date in this demo is between 1 and 8 hours.", 422);
  }
  return minutes;
}

export function snapshotPrice(input: {
  hourlyRateMinor: number;
  minutes: number;
  currency: string;
  platformFeeBps: number | null;
}): {
  priceMinor: number;
  currency: string;
  platformFeeMinor: number | null;
  feePolicy: FeePolicy;
  companionPayoutMinor: number | null;
} {
  if (!Number.isInteger(input.hourlyRateMinor) || input.hourlyRateMinor <= 0) {
    throw new DomainError("INVALID_PRICE", "Companion rate must be a positive integer of minor units.", 422);
  }
  if (!Number.isInteger(input.minutes) || input.minutes <= 0) {
    throw new DomainError("INVALID_WINDOW", "Duration must be a positive whole number of minutes.", 422);
  }
  const priceMinor = (input.hourlyRateMinor * input.minutes) / 60;
  if (!Number.isInteger(priceMinor)) {
    throw new DomainError("INVALID_PRICE", "This rate does not divide evenly across that duration.", 422);
  }
  if (input.platformFeeBps == null) {
    return {
      priceMinor,
      currency: input.currency,
      platformFeeMinor: null,
      feePolicy: "unknown",
      companionPayoutMinor: null,
    };
  }
  if (!Number.isInteger(input.platformFeeBps) || input.platformFeeBps < 0 || input.platformFeeBps > 10_000) {
    throw new DomainError("INVALID_FEE", "Platform fee basis points must be an integer from 0 to 10000.", 422);
  }
  const platformFeeMinor = Math.round((priceMinor * input.platformFeeBps) / 10_000);
  return {
    priceMinor,
    currency: input.currency,
    platformFeeMinor,
    feePolicy: "configured",
    companionPayoutMinor: priceMinor - platformFeeMinor,
  };
}
