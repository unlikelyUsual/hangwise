import type {
  Actor,
  AuditEntry,
  AvailabilityWindow,
  BookingRecord,
  BookingTransition,
  CheckInRecord,
  ConversationSummary,
  IdempotencyRow,
  MessageRecord,
  PaymentRecord,
  PublicCompanion,
  ReportCategory,
  ReportRecord,
  RequestedBookingWrite,
  ReviewRecord,
  UserRecord,
  VerificationRecord,
} from "../domain/types";

export const HANGWISE_DATA = Symbol("HANGWISE_DATA");

export type NewReport = {
  reporterUserId: string;
  subjectUserId: string | null;
  bookingId: string | null;
  category: ReportCategory;
  body: string;
};

export type NewCheckIn = {
  bookingId: string;
  userId: string;
  note: string;
};

export type NewReview = {
  bookingId: string;
  authorUserId: string;
  rating: number;
  body: string;
};

export type NewAudit = {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
};

export interface HangwiseData {
  getUser(id: string): Promise<UserRecord | null>;
  listListedCompanions(city?: string): Promise<PublicCompanion[]>;
  getCompanion(id: string): Promise<PublicCompanion | null>;
  getCompanionByUserId(userId: string): Promise<PublicCompanion | null>;
  listAvailability(companionProfileId: string): Promise<AvailabilityWindow[]>;
  hasBlock(leftUserId: string, rightUserId: string): Promise<boolean>;
  requestBooking(input: RequestedBookingWrite): Promise<BookingRecord>;
  getBooking(id: string): Promise<BookingRecord | null>;
  listBookingsForCustomer(userId: string): Promise<BookingRecord[]>;
  listBookingsForCompanion(profileId: string): Promise<BookingRecord[]>;
  listAllBookings(): Promise<BookingRecord[]>;
  transitionBooking(id: string, change: BookingTransition): Promise<BookingRecord>;
  expireDueHolds(now: Date): Promise<number>;
  findIdempotency(actorUserId: string, key: string): Promise<IdempotencyRow | null>;
  listConversations(userId: string): Promise<ConversationSummary[]>;
  listMessages(conversationId: string): Promise<MessageRecord[]>;
  addMessage(conversationId: string, senderUserId: string, body: string): Promise<MessageRecord>;
  conversationMemberIds(conversationId: string): Promise<string[]>;
  createReport(input: NewReport): Promise<ReportRecord>;
  createBlock(blockerUserId: string, blockedUserId: string): Promise<{ alreadyBlocked: boolean }>;
  createCheckIn(input: NewCheckIn): Promise<CheckInRecord>;
  listCheckIns(bookingId: string): Promise<CheckInRecord[]>;
  createReview(input: NewReview): Promise<ReviewRecord>;
  listReviewsForBooking(bookingId: string): Promise<ReviewRecord[]>;
  findReview(bookingId: string, authorUserId: string): Promise<ReviewRecord | null>;
  writeAudit(entry: NewAudit): Promise<void>;
  listAudit(limit: number): Promise<AuditEntry[]>;
  getPaymentForBooking(bookingId: string): Promise<PaymentRecord | null>;
  getVerification(userId: string): Promise<VerificationRecord | null>;
}

export type { Actor };
