import { randomUUID } from "crypto";
import { COMPANION_BOUNDARIES } from "../domain/policy";
import { snapshotPrice } from "../domain/quote";
import type {
  AuditEntry,
  AvailabilityWindow,
  BookingRecord,
  CheckInRecord,
  ConversationRecord,
  MessageRecord,
  PaymentRecord,
  PrivateProfileRecord,
  PublicCompanion,
  ReviewRecord,
  UserRecord,
  VerificationRecord,
} from "../domain/types";
import { DemoUserIds } from "./personas";

export const DemoProfileIds = {
  maya: "44444444-4444-4444-8444-444444444441",
  arun: "44444444-4444-4444-8444-444444444442",
  lena: "44444444-4444-4444-8444-444444444443",
  kenji: "44444444-4444-4444-8444-444444444444",
} as const;

export const DemoBookingIds = {
  mayaRequested: "55555555-5555-4555-8555-555555555551",
  mayaAccepted: "55555555-5555-4555-8555-555555555552",
  mayaOverlapRequest: "55555555-5555-4555-8555-555555555553",
  arunHold: "55555555-5555-4555-8555-555555555554",
  lenaCompleted: "55555555-5555-4555-8555-555555555555",
  kenjiCancelled: "55555555-5555-4555-8555-555555555556",
  kenjiDeclined: "55555555-5555-4555-8555-555555555557",
} as const;

export type Ymd = { year: number; month: number; day: number };

export type DemoDataset = {
  users: UserRecord[];
  privateProfiles: PrivateProfileRecord[];
  companions: PublicCompanion[];
  availability: AvailabilityWindow[];
  bookings: BookingRecord[];
  payments: PaymentRecord[];
  conversations: ConversationRecord[];
  messages: MessageRecord[];
  reviews: ReviewRecord[];
  checkIns: CheckInRecord[];
  verifications: VerificationRecord[];
  audits: AuditEntry[];
};

export function bangkokDate(now: Date): Ymd {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

export function addDays(date: Ymd, days: number): Ymd {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

export function bangkokWindow(date: Ymd): { startsAt: Date; endsAt: Date } {
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return {
    startsAt: new Date(`${date.year}-${month}-${day}T03:00:00.000Z`),
    endsAt: new Date(`${date.year}-${month}-${day}T11:00:00.000Z`),
  };
}

export function slotOn(date: Ymd, startHourBangkok: number, durationHours: number): { startsAt: Date; endsAt: Date } {
  const window = bangkokWindow(date);
  const startsAt = new Date(window.startsAt.getTime() + (startHourBangkok - 10) * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);
  if (startsAt < window.startsAt || endsAt > window.endsAt) {
    throw new Error("Demo slot falls outside 10:00-18:00 Asia/Bangkok");
  }
  return { startsAt, endsAt };
}

function demoEmail(label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
  return `${slug}@demo.hangwise.invalid`;
}

function user(id: string, label: string, role: UserRecord["role"]): UserRecord {
  return { id, email: demoEmail(label), displayName: label, role, isDemo: true, deletedAt: null };
}

export function buildDemoDataset(now: Date): DemoDataset {
  const today = bangkokDate(now);
  const users: UserRecord[] = [
    user(DemoUserIds.alex, "Alex Demo", "customer"),
    user(DemoUserIds.priya, "Priya Demo", "customer"),
    user(DemoUserIds.maya, "Maya Srisai", "companion"),
    user(DemoUserIds.arun, "Arun Desai", "companion"),
    user(DemoUserIds.lena, "Lena Moretti", "companion"),
    user(DemoUserIds.kenji, "Kenji Aoki", "companion"),
    user(DemoUserIds.admin, "Admin Demo", "admin"),
  ];
  const privateProfiles: PrivateProfileRecord[] = users.map((row) => ({
    userId: row.id,
    phoneE164: null,
    locale: "en",
    countryCode: null,
    termsAcceptedAt: null,
    privacyAcceptedAt: null,
  }));
  const companions: PublicCompanion[] = [
    {
      id: DemoProfileIds.maya,
      userId: DemoUserIds.maya,
      publicName: "Maya Srisai",
      ageYears: 29,
      headline: "Daytime walks and gallery hours",
      bio: "Fictional companion. I host daytime walks and gallery visits in Bangkok. Public places only.",
      city: "Bangkok",
      area: "Pathum Wan",
      status: "listed",
      hourlyRateMinor: 150_000,
      currency: "THB",
      languages: ["English", "Thai"],
      boundaries: COMPANION_BOUNDARIES,
    },
    {
      id: DemoProfileIds.arun,
      userId: DemoUserIds.arun,
      publicName: "Arun Desai",
      ageYears: 31,
      headline: "Coffee, bookshops, one museum",
      bio: "Fictional companion. Coffee, bookshops, and a museum hour. Not a date with romantic entitlement.",
      city: "Bangkok",
      area: "Phra Nakhon",
      status: "listed",
      hourlyRateMinor: 120_000,
      currency: "THB",
      languages: ["English", "Hindi", "Thai"],
      boundaries: COMPANION_BOUNDARIES,
    },
    {
      id: DemoProfileIds.lena,
      userId: DemoUserIds.lena,
      publicName: "Lena Moretti",
      ageYears: 27,
      headline: "Markets and park benches",
      bio: "Fictional companion. Food markets and park benches, in public, for the booked time only.",
      city: "Bangkok",
      area: "Bang Rak",
      status: "listed",
      hourlyRateMinor: 180_000,
      currency: "THB",
      languages: ["English", "Italian"],
      boundaries: COMPANION_BOUNDARIES,
    },
    {
      id: DemoProfileIds.kenji,
      userId: DemoUserIds.kenji,
      publicName: "Kenji Aoki",
      ageYears: 34,
      headline: "Quiet cafes and photo walks",
      bio: "Fictional companion. Quiet cafes and photo walks. The booking is paid time, nothing else.",
      city: "Bangkok",
      area: "Khlong Toei",
      status: "listed",
      hourlyRateMinor: 160_000,
      currency: "THB",
      languages: ["English", "Japanese"],
      boundaries: COMPANION_BOUNDARIES,
    },
  ];

  const availability: AvailabilityWindow[] = [];
  for (const companion of companions) {
    for (const offset of [-3, 1, 2, 3, 4, 5, 6, 7]) {
      const window = bangkokWindow(addDays(today, offset));
      availability.push({
        id: randomUUID(),
        companionProfileId: companion.id,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
      });
    }
  }

  const rate = (profileId: string) => companions.find((companion) => companion.id === profileId)!.hourlyRateMinor;
  const priced = (profileId: string, startsAt: Date, endsAt: Date) => {
    const minutes = (endsAt.getTime() - startsAt.getTime()) / 60_000;
    return snapshotPrice({ hourlyRateMinor: rate(profileId), minutes, currency: "THB", platformFeeBps: null });
  };
  const span = (offset: number, hour: number, duration: number) => slotOn(addDays(today, offset), hour, duration);

  const requestedSpan = span(1, 10, 2);
  const acceptedSpan = span(2, 10, 2);
  const overlapSpan = span(2, 11, 2);
  const holdSpan = span(3, 10, 2);
  const completedSpan = span(-3, 10, 2);
  const cancelledSpan = span(4, 10, 2);
  const declinedSpan = span(5, 10, 2);

  const booking = (
    id: string,
    customerId: string,
    companionProfileId: string,
    slot: { startsAt: Date; endsAt: Date },
    status: BookingRecord["status"],
    venueName: string,
    venueArea: string,
    note: string | null,
    extra: Partial<BookingRecord> = {},
  ): BookingRecord => {
    const price = priced(companionProfileId, slot.startsAt, slot.endsAt);
    return {
      id,
      customerId,
      companionProfileId,
      venueName,
      venueArea,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      status,
      priceMinor: price.priceMinor,
      currency: "THB",
      platformFeeMinor: null,
      feePolicy: "unknown",
      customerNote: note,
      holdExpiresAt: null,
      requestedAt: new Date(slot.startsAt.getTime() - 24 * 60 * 60 * 1000),
      acceptedAt: null,
      declinedAt: null,
      cancelledAt: null,
      completedAt: null,
      expiredAt: null,
      cancelledByUserId: null,
      ...extra,
    };
  };

  const bookings: BookingRecord[] = [
    booking(DemoBookingIds.mayaRequested, DemoUserIds.alex, DemoProfileIds.maya, requestedSpan, "requested", "Lumpini Park", "Pathum Wan", "A public walk only."),
    booking(DemoBookingIds.mayaAccepted, DemoUserIds.priya, DemoProfileIds.maya, acceptedSpan, "accepted", "Bangkok Art and Culture Centre", "Pathum Wan", "Gallery hour, public building.", { acceptedAt: acceptedSpan.startsAt }),
    booking(DemoBookingIds.mayaOverlapRequest, DemoUserIds.alex, DemoProfileIds.maya, overlapSpan, "requested", "Benjakitti Park", "Khlong Toei", "This request overlaps an accepted booking and should not be accepted."),
    booking(DemoBookingIds.arunHold, DemoUserIds.alex, DemoProfileIds.arun, holdSpan, "hold", "Benjakitti Park", "Khlong Toei", "Hold is not a payment.", {
      acceptedAt: holdSpan.startsAt,
      holdExpiresAt: new Date(now.getTime() + 30 * 60_000),
    }),
    booking(DemoBookingIds.lenaCompleted, DemoUserIds.alex, DemoProfileIds.lena, completedSpan, "completed", "Lumpini Park", "Pathum Wan", "Completed demo row. No payment was captured.", {
      acceptedAt: completedSpan.startsAt,
      completedAt: completedSpan.endsAt,
    }),
    booking(DemoBookingIds.kenjiCancelled, DemoUserIds.priya, DemoProfileIds.kenji, cancelledSpan, "cancelled", "Riverside Reading Room", "Bang Rak", "Cancelled demo row.", {
      cancelledAt: now,
      cancelledByUserId: DemoUserIds.priya,
    }),
    booking(DemoBookingIds.kenjiDeclined, DemoUserIds.alex, DemoProfileIds.kenji, declinedSpan, "declined", "Paper Lantern Café", "Phra Nakhon", "Declined demo row.", {
      declinedAt: now,
    }),
  ];

  const payments: PaymentRecord[] = bookings.map((row) => ({
    id: randomUUID(),
    bookingId: row.id,
    status: "unavailable",
    provider: "unconfigured",
    amountMinor: row.priceMinor,
    currency: row.currency,
    externalReference: null,
  }));

  const memberIds = (row: BookingRecord) => {
    const companion = companions.find((item) => item.id === row.companionProfileId)!;
    return [row.customerId, companion.userId];
  };
  const conversations: ConversationRecord[] = bookings.map((row) => ({
    id: randomUUID(),
    bookingId: row.id,
    memberUserIds: memberIds(row),
    createdAt: row.requestedAt,
  }));
  const requestedConversation = conversations.find((conversation) => conversation.bookingId === DemoBookingIds.mayaRequested)!;
  const messages: MessageRecord[] = [
    {
      id: randomUUID(),
      conversationId: requestedConversation.id,
      senderUserId: DemoUserIds.alex,
      body: "Hi Maya. Lumpini Park still works for a walk. This is a public date, nothing else.",
      createdAt: new Date(now.getTime() - 60 * 60 * 1000),
    },
  ];
  const completed = bookings.find((row) => row.id === DemoBookingIds.lenaCompleted)!;
  const reviews: ReviewRecord[] = [
    {
      id: randomUUID(),
      bookingId: completed.id,
      authorUserId: DemoUserIds.alex,
      rating: 5,
      body: "Demo review only. We walked in a public park. This is not a verified review.",
      createdAt: completed.completedAt ?? now,
    },
  ];
  const checkIns: CheckInRecord[] = [
    {
      id: randomUUID(),
      bookingId: completed.id,
      userId: DemoUserIds.alex,
      note: "Demo check-in note. Nobody is watching this.",
      monitored: false,
      createdAt: completed.startsAt,
    },
  ];
  const verifications: VerificationRecord[] = users.map((row) => ({
    id: randomUUID(),
    userId: row.id,
    kind: "identity",
    provider: "unconfigured",
    status: "unavailable",
    externalReference: null,
  }));
  const audits: AuditEntry[] = bookings.map((row) => ({
    id: randomUUID(),
    actorUserId: null,
    action: "seed.booking",
    entityType: "booking",
    entityId: row.id,
    metadata: { status: row.status, demo: true },
    createdAt: row.requestedAt,
  }));

  return {
    users,
    privateProfiles,
    companions,
    availability,
    bookings,
    payments,
    conversations,
    messages,
    reviews,
    checkIns,
    verifications,
    audits,
  };
}
