import { DomainError } from "../domain/errors";
import type { Actor, BookingRecord } from "../domain/types";
import type { HangwiseData } from "../data/hangwise-data";

export async function requireBooking(data: HangwiseData, id: string): Promise<BookingRecord> {
  const booking = await data.getBooking(id);
  if (!booking) throw new DomainError("NOT_FOUND", "Booking not found.", 404);
  return booking;
}

export async function isParticipant(data: HangwiseData, actor: Actor, booking: BookingRecord): Promise<boolean> {
  if (booking.customerId === actor.userId) return true;
  const profile = await data.getCompanionByUserId(actor.userId);
  return profile?.id === booking.companionProfileId;
}

export async function requireVisibleBooking(data: HangwiseData, actor: Actor, id: string): Promise<BookingRecord> {
  const booking = await requireBooking(data, id);
  if (actor.role === "admin") return booking;
  if (await isParticipant(data, actor, booking)) return booking;
  throw new DomainError("NOT_FOUND", "Booking not found.", 404);
}

export async function assertCompanionSide(data: HangwiseData, actor: Actor, booking: BookingRecord): Promise<void> {
  if (actor.role === "admin") return;
  const profile = await data.getCompanionByUserId(actor.userId);
  if (profile && profile.id === booking.companionProfileId) return;
  if (booking.customerId === actor.userId) {
    throw new DomainError("FORBIDDEN", "Only the booked companion can do that.", 403);
  }
  throw new DomainError("NOT_FOUND", "Booking not found.", 404);
}
