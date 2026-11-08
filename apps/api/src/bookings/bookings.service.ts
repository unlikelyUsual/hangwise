import { randomUUID } from "crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ENV, type Env } from "../config/env";
import { HANGWISE_DATA, type HangwiseData } from "../data/hangwise-data";
import { DomainError, isUniqueViolation } from "../domain/errors";
import { canonicalJson, sha256 } from "../domain/hash";
import { presentBooking, type BookingView } from "../domain/present";
import { assertBookableWindow, snapshotPrice } from "../domain/quote";
import type { Actor, BookingRecord } from "../domain/types";
import { assertCompanionSide, isParticipant, requireBooking, requireVisibleBooking } from "./access";

export type CreateBookingInput = {
  companionProfileId: string;
  startsAt: string;
  endsAt: string;
  venueName: string;
  venueArea: string;
  note?: string;
  acknowledgedPublicDatePolicy: boolean;
};

@Injectable()
export class BookingsService {
  constructor(
    @Inject(HANGWISE_DATA) private readonly data: HangwiseData,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async create(actor: Actor, input: CreateBookingInput, idempotencyKey: string | undefined): Promise<BookingView> {
    if (actor.role !== "customer") {
      throw new DomainError("FORBIDDEN", "Only a customer can request a date.", 403);
    }
    const key = idempotencyKey?.trim() ?? "";
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(key)) {
      throw new DomainError(
        "IDEMPOTENCY_KEY_REQUIRED",
        "Send an Idempotency-Key header of 8 to 80 letters, numbers, underscores, or hyphens.",
        400,
      );
    }
    if (input.acknowledgedPublicDatePolicy !== true) {
      throw new DomainError("POLICY_ACK_REQUIRED", "Acknowledge the public-date policy before requesting.", 422);
    }
    const startsAt = parseInstant(input.startsAt);
    const endsAt = parseInstant(input.endsAt);
    const minutes = assertBookableWindow(startsAt, endsAt);
    if (startsAt.getTime() < Date.now() - 5 * 60_000) {
      throw new DomainError("INVALID_WINDOW", "Choose a start time in the future.", 422);
    }
    const venueName = requiredText(input.venueName, "Name a public venue.");
    const venueArea = requiredText(input.venueArea, "Name the area.");
    const note = optionalNote(input.note);
    const requestHash = sha256(
      canonicalJson({
        companionProfileId: input.companionProfileId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        venueName,
        venueArea,
        note,
        acknowledgedPublicDatePolicy: true,
      }),
    );
    const replay = await this.replay(actor.userId, key, requestHash);
    if (replay) return replay;

    const companion = await this.data.getCompanion(input.companionProfileId);
    if (!companion || companion.status !== "listed") {
      throw new DomainError("NOT_FOUND", "Companion not found.", 404);
    }
    if (companion.currency.trim() !== "THB") {
      throw new DomainError("CURRENCY_UNSUPPORTED", "This skeleton snapshots THB only.", 422);
    }
    if (await this.data.hasBlock(actor.userId, companion.userId)) {
      throw new DomainError("FORBIDDEN", "Booking is blocked between these accounts.", 403);
    }
    const windows = await this.data.listAvailability(companion.id);
    const inside = windows.some((window) => window.startsAt.getTime() <= startsAt.getTime() && window.endsAt.getTime() >= endsAt.getTime());
    if (!inside) {
      throw new DomainError("OUTSIDE_AVAILABILITY", "That time is outside the companion's published availability.", 422);
    }
    const price = snapshotPrice({
      hourlyRateMinor: companion.hourlyRateMinor,
      minutes,
      currency: "THB",
      platformFeeBps: this.env.platformFeeBps,
    });
    const booking: BookingRecord = {
      id: randomUUID(),
      customerId: actor.userId,
      companionProfileId: companion.id,
      venueName,
      venueArea,
      startsAt,
      endsAt,
      status: "requested",
      priceMinor: price.priceMinor,
      currency: price.currency,
      platformFeeMinor: price.platformFeeMinor,
      feePolicy: price.feePolicy,
      customerNote: note,
      holdExpiresAt: null,
      requestedAt: new Date(),
      acceptedAt: null,
      declinedAt: null,
      cancelledAt: null,
      completedAt: null,
      expiredAt: null,
      cancelledByUserId: null,
    };
    const view = presentBooking(booking);
    try {
      await this.data.requestBooking({
        booking,
        memberUserIds: [actor.userId, companion.userId],
        idempotency: { key, requestHash, responseBody: view },
        auditAction: "booking.requested",
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const raced = await this.replay(actor.userId, key, requestHash);
      if (raced) return raced;
      throw new DomainError("IDEMPOTENCY_MISMATCH", "This Idempotency-Key was already used for a different request.", 409);
    }
    return view;
  }

  async list(actor: Actor): Promise<BookingView[]> {
    const rows =
      actor.role === "admin"
        ? await this.data.listAllBookings()
        : actor.role === "customer"
          ? await this.data.listBookingsForCustomer(actor.userId)
          : await this.companionBookings(actor.userId);
    return rows.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime()).map(presentBooking);
  }

  async get(actor: Actor, id: string): Promise<BookingView> {
    return presentBooking(await requireVisibleBooking(this.data, actor, id));
  }

  async accept(actor: Actor, id: string): Promise<BookingView> {
    const booking = await requireBooking(this.data, id);
    await assertCompanionSide(this.data, actor, booking);
    if (booking.status !== "requested") {
      throw new DomainError("INVALID_TRANSITION", `Cannot accept a booking that is ${booking.status}.`, 409);
    }
    const updated = await this.data.transitionBooking(id, { from: "requested", to: "accepted", actorUserId: actor.userId });
    return presentBooking(updated);
  }

  async decline(actor: Actor, id: string): Promise<BookingView> {
    const booking = await requireBooking(this.data, id);
    await assertCompanionSide(this.data, actor, booking);
    if (booking.status !== "requested") {
      throw new DomainError("INVALID_TRANSITION", `Cannot decline a booking that is ${booking.status}.`, 409);
    }
    const updated = await this.data.transitionBooking(id, { from: "requested", to: "declined", actorUserId: actor.userId });
    return presentBooking(updated);
  }

  async hold(actor: Actor, id: string, holdMinutes: number): Promise<BookingView> {
    if (!Number.isInteger(holdMinutes) || holdMinutes < 15 || holdMinutes > 120) {
      throw new DomainError("INVALID_HOLD", "Hold length must be 15 to 120 minutes. A hold does not authorize payment.", 422);
    }
    const booking = await requireBooking(this.data, id);
    await assertCompanionSide(this.data, actor, booking);
    if (booking.status !== "accepted") {
      throw new DomainError("INVALID_TRANSITION", "Only an accepted booking can be placed on hold, and a hold does not charge anyone.", 409);
    }
    const updated = await this.data.transitionBooking(id, {
      from: "accepted",
      to: "hold",
      actorUserId: actor.userId,
      holdExpiresAt: new Date(Date.now() + holdMinutes * 60_000),
    });
    return presentBooking(updated);
  }

  async cancel(actor: Actor, id: string): Promise<BookingView> {
    const booking = await requireBooking(this.data, id);
    const participant = await isParticipant(this.data, actor, booking);
    if (actor.role !== "admin" && !participant) {
      throw new DomainError("NOT_FOUND", "Booking not found.", 404);
    }
    if (!["requested", "accepted", "hold"].includes(booking.status)) {
      throw new DomainError("INVALID_TRANSITION", `Cannot cancel a booking that is ${booking.status}.`, 409);
    }
    const profile = await this.data.getCompanionByUserId(actor.userId);
    const companionSide = profile?.id === booking.companionProfileId;
    if (actor.role !== "admin" && companionSide && booking.status === "requested") {
      throw new DomainError("INVALID_TRANSITION", "Decline a request instead of cancelling it.", 409);
    }
    if (actor.role !== "admin" && companionSide && !["accepted", "hold"].includes(booking.status)) {
      throw new DomainError("INVALID_TRANSITION", `Cannot cancel a booking that is ${booking.status}.`, 409);
    }
    const updated = await this.data.transitionBooking(id, {
      from: booking.status,
      to: "cancelled",
      actorUserId: actor.userId,
      cancelledByUserId: actor.userId,
    });
    return presentBooking(updated);
  }

  async complete(actor: Actor, id: string): Promise<BookingView> {
    const booking = await requireBooking(this.data, id);
    await assertCompanionSide(this.data, actor, booking);
    if (booking.status === "hold") {
      throw new DomainError(
        "INVALID_TRANSITION",
        "A hold is not a payment confirmation and cannot be completed while payments are disabled.",
        409,
      );
    }
    if (booking.status !== "accepted") {
      throw new DomainError("INVALID_TRANSITION", `Cannot complete a booking that is ${booking.status}.`, 409);
    }
    const updated = await this.data.transitionBooking(id, { from: "accepted", to: "completed", actorUserId: actor.userId });
    return presentBooking(updated);
  }

  async expireDueHolds(now = new Date()): Promise<number> {
    return this.data.expireDueHolds(now);
  }

  private async companionBookings(userId: string): Promise<BookingRecord[]> {
    const profile = await this.data.getCompanionByUserId(userId);
    return profile ? this.data.listBookingsForCompanion(profile.id) : [];
  }

  private async replay(actorUserId: string, key: string, requestHash: string): Promise<BookingView | null> {
    const existing = await this.data.findIdempotency(actorUserId, key);
    if (!existing) return null;
    if (existing.requestHash !== requestHash) {
      throw new DomainError("IDEMPOTENCY_MISMATCH", "This Idempotency-Key was already used for a different request.", 409);
    }
    return existing.responseBody as BookingView;
  }
}

function parseInstant(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new DomainError("INVALID_WINDOW", "Use an ISO-8601 start and end with a timezone.", 422);
  }
  return date;
}

function requiredText(value: string, message: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 120) throw new DomainError("INVALID_VENUE", message, 422);
  return trimmed;
}

function optionalNote(value: string | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 500) throw new DomainError("INVALID_NOTE", "Keep the note under 500 characters.", 422);
  return trimmed;
}
