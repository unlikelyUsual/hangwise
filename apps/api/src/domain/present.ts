import type {
  AvailabilityWindow,
  BookingRecord,
  CheckInRecord,
  MessageRecord,
  PublicCompanion,
  ReviewRecord,
} from "./types";

export function presentBooking(booking: BookingRecord) {
  return {
    id: booking.id,
    demo: true as const,
    paymentAuthorized: false as const,
    customerId: booking.customerId,
    companionProfileId: booking.companionProfileId,
    venueName: booking.venueName,
    venueArea: booking.venueArea,
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    status: booking.status,
    customerNote: booking.customerNote,
    holdExpiresAt: booking.holdExpiresAt?.toISOString() ?? null,
    requestedAt: booking.requestedAt.toISOString(),
    acceptedAt: booking.acceptedAt?.toISOString() ?? null,
    declinedAt: booking.declinedAt?.toISOString() ?? null,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    completedAt: booking.completedAt?.toISOString() ?? null,
    expiredAt: booking.expiredAt?.toISOString() ?? null,
    price: {
      minor: booking.priceMinor,
      currency: booking.currency.trim(),
      platformFeeMinor: booking.platformFeeMinor,
      feePolicy: booking.feePolicy,
      exponent: 2 as const,
      takeRate: booking.feePolicy === "unknown" ? ("unknown" as const) : ("configured" as const),
    },
  };
}

export type BookingView = ReturnType<typeof presentBooking>;

export function presentCompanion(companion: PublicCompanion) {
  return {
    id: companion.id,
    userId: companion.userId,
    publicName: companion.publicName,
    ageYears: companion.ageYears,
    ageVerified: false as const,
    identityVerified: false as const,
    headline: companion.headline,
    bio: companion.bio,
    city: companion.city,
    area: companion.area,
    status: companion.status,
    hourlyRateMinor: companion.hourlyRateMinor,
    currency: companion.currency.trim(),
    languages: companion.languages,
    boundaries: companion.boundaries,
    demo: true as const,
  };
}

export function presentAvailability(window: AvailabilityWindow) {
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return {
    id: window.id,
    companionProfileId: window.companionProfileId,
    startsAt: window.startsAt.toISOString(),
    endsAt: window.endsAt.toISOString(),
    timezone: "Asia/Bangkok",
    label: `${format.format(window.startsAt)} – ${format.format(window.endsAt)} Asia/Bangkok`,
  };
}

export function presentMessage(message: MessageRecord) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderUserId: message.senderUserId,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    demo: true as const,
  };
}

export function presentReview(review: ReviewRecord) {
  return {
    id: review.id,
    bookingId: review.bookingId,
    authorUserId: review.authorUserId,
    rating: review.rating,
    body: review.body,
    createdAt: review.createdAt.toISOString(),
    demo: true as const,
    verified: false as const,
  };
}

export function presentCheckIn(checkIn: CheckInRecord) {
  return {
    id: checkIn.id,
    bookingId: checkIn.bookingId,
    userId: checkIn.userId,
    note: checkIn.note,
    createdAt: checkIn.createdAt.toISOString(),
    monitored: false as const,
    emergencyService: false as const,
    demo: true as const,
  };
}
