export type UserRole = "customer" | "companion" | "admin";
export type CompanionStatus = "draft" | "listed" | "paused" | "suspended";
export type BookingStatus =
  | "requested"
  | "accepted"
  | "hold"
  | "expired"
  | "declined"
  | "cancelled"
  | "completed";
export type FeePolicy = "unknown" | "configured";
export type PaymentStatus =
  | "unavailable"
  | "not_started"
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"
  | "cancelled";
export type VerificationStatus = "unavailable" | "not_started" | "pending" | "approved" | "rejected";
export type ReportCategory = "policy" | "safety" | "other";

export type Actor = {
  userId: string;
  role: UserRole;
  displayName: string;
  isDemo: boolean;
};

export type UserRecord = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isDemo: boolean;
  deletedAt: Date | null;
};

export type PrivateProfileRecord = {
  userId: string;
  phoneE164: null;
  locale: string;
  countryCode: null;
  termsAcceptedAt: null;
  privacyAcceptedAt: null;
};

export type PublicCompanion = {
  id: string;
  userId: string;
  publicName: string;
  ageYears: number;
  headline: string;
  bio: string;
  city: string;
  area: string;
  status: CompanionStatus;
  hourlyRateMinor: number;
  currency: string;
  languages: string[];
  boundaries: string;
};

export type AvailabilityWindow = {
  id: string;
  companionProfileId: string;
  startsAt: Date;
  endsAt: Date;
};

export type BookingRecord = {
  id: string;
  customerId: string;
  companionProfileId: string;
  venueName: string;
  venueArea: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  priceMinor: number;
  currency: string;
  platformFeeMinor: number | null;
  feePolicy: FeePolicy;
  customerNote: string | null;
  holdExpiresAt: Date | null;
  requestedAt: Date;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  cancelledAt: Date | null;
  completedAt: Date | null;
  expiredAt: Date | null;
  cancelledByUserId: string | null;
};

export type PaymentRecord = {
  id: string;
  bookingId: string;
  status: PaymentStatus;
  provider: string;
  amountMinor: number;
  currency: string;
  externalReference: string | null;
};

export type ConversationRecord = {
  id: string;
  bookingId: string | null;
  memberUserIds: string[];
  createdAt: Date;
};

export type ConversationSummary = {
  id: string;
  bookingId: string | null;
  memberUserIds: string[];
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  createdAt: Date;
};

export type IdempotencyRow = {
  actorUserId: string;
  key: string;
  requestHash: string;
  responseBody: unknown;
};

export type ReportRecord = {
  id: string;
  reporterUserId: string;
  subjectUserId: string | null;
  bookingId: string | null;
  category: ReportCategory;
  body: string;
  status: "open";
  createdAt: Date;
};

export type CheckInRecord = {
  id: string;
  bookingId: string;
  userId: string;
  note: string;
  monitored: false;
  createdAt: Date;
};

export type ReviewRecord = {
  id: string;
  bookingId: string;
  authorUserId: string;
  rating: number;
  body: string;
  createdAt: Date;
};

export type AuditEntry = {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export type VerificationRecord = {
  id: string;
  userId: string;
  kind: string;
  provider: string;
  status: VerificationStatus;
  externalReference: string | null;
};

export type BookingTransition = {
  from: BookingStatus;
  to: BookingStatus;
  actorUserId: string;
  holdExpiresAt?: Date | null;
  cancelledByUserId?: string | null;
};

export type RequestedBookingWrite = {
  booking: BookingRecord;
  memberUserIds: string[];
  idempotency: { key: string; requestHash: string; responseBody: unknown };
  auditAction: string;
};
