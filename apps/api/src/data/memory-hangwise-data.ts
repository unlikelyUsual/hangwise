import { randomUUID } from "crypto";
import { DomainError } from "../domain/errors";
import { rangesOverlap } from "../domain/overlap";
import type { DemoDataset } from "../demo/dataset";
import type {
  AuditEntry,
  AvailabilityWindow,
  BookingRecord,
  BookingTransition,
  CheckInRecord,
  ConversationRecord,
  ConversationSummary,
  IdempotencyRow,
  MessageRecord,
  PaymentRecord,
  PublicCompanion,
  ReportRecord,
  RequestedBookingWrite,
  ReviewRecord,
  UserRecord,
  VerificationRecord,
} from "../domain/types";
import type { HangwiseData, NewAudit, NewCheckIn, NewReport, NewReview } from "./hangwise-data";

export class MemoryHangwiseData implements HangwiseData {
  private readonly users: UserRecord[];
  private readonly companions: PublicCompanion[];
  private readonly availability: AvailabilityWindow[];
  private readonly bookings: BookingRecord[];
  private readonly payments: PaymentRecord[];
  private readonly conversations: ConversationRecord[];
  private readonly messages: MessageRecord[];
  private readonly reports: ReportRecord[] = [];
  private readonly blocks: { blockerUserId: string; blockedUserId: string }[] = [];
  private readonly checkIns: CheckInRecord[];
  private readonly reviews: ReviewRecord[];
  private readonly audits: AuditEntry[];
  private readonly verifications: VerificationRecord[];
  private readonly idempotency: IdempotencyRow[] = [];

  constructor(dataset: DemoDataset) {
    this.users = dataset.users.map((row) => ({ ...row }));
    this.companions = dataset.companions.map((row) => ({ ...row, languages: [...row.languages] }));
    this.availability = dataset.availability.map((row) => ({ ...row }));
    this.bookings = dataset.bookings.map((row) => ({ ...row }));
    this.payments = dataset.payments.map((row) => ({ ...row }));
    this.conversations = dataset.conversations.map((row) => ({ ...row, memberUserIds: [...row.memberUserIds] }));
    this.messages = dataset.messages.map((row) => ({ ...row }));
    this.checkIns = dataset.checkIns.map((row) => ({ ...row }));
    this.reviews = dataset.reviews.map((row) => ({ ...row }));
    this.audits = dataset.audits.map((row) => ({ ...row }));
    this.verifications = dataset.verifications.map((row) => ({ ...row }));
  }

  async getUser(id: string): Promise<UserRecord | null> {
    const user = this.users.find((row) => row.id === id && row.deletedAt == null);
    return user ? { ...user } : null;
  }

  async listListedCompanions(city?: string): Promise<PublicCompanion[]> {
    return this.companions
      .filter((row) => row.status === "listed")
      .filter((row) => (city ? row.city.toLowerCase() === city.toLowerCase() : true))
      .map((row) => ({ ...row, languages: [...row.languages] }));
  }

  async getCompanion(id: string): Promise<PublicCompanion | null> {
    const row = this.companions.find((companion) => companion.id === id);
    return row ? { ...row, languages: [...row.languages] } : null;
  }

  async getCompanionByUserId(userId: string): Promise<PublicCompanion | null> {
    const row = this.companions.find((companion) => companion.userId === userId);
    return row ? { ...row, languages: [...row.languages] } : null;
  }

  async listAvailability(companionProfileId: string): Promise<AvailabilityWindow[]> {
    return this.availability
      .filter((row) => row.companionProfileId === companionProfileId)
      .map((row) => ({ ...row }))
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }

  async hasBlock(leftUserId: string, rightUserId: string): Promise<boolean> {
    return this.blocks.some(
      (block) =>
        (block.blockerUserId === leftUserId && block.blockedUserId === rightUserId) ||
        (block.blockerUserId === rightUserId && block.blockedUserId === leftUserId),
    );
  }

  async requestBooking(input: RequestedBookingWrite): Promise<BookingRecord> {
    if (this.overlapsBlocking(input.booking.companionProfileId, input.booking.startsAt, input.booking.endsAt)) {
      throw new DomainError("BOOKING_CONFLICT", "That companion already has an accepted or held booking in this window.", 409);
    }
    const existing = this.idempotency.find((row) => row.actorUserId === input.booking.customerId && row.key === input.idempotency.key);
    if (existing) {
      const error = new Error("Unique constraint failed on idempotency");
      (error as Error & { code: string }).code = "23505";
      throw error;
    }
    this.bookings.push({ ...input.booking, status: "requested" });
    this.payments.push({
      id: randomUUID(),
      bookingId: input.booking.id,
      status: "unavailable",
      provider: "unconfigured",
      amountMinor: input.booking.priceMinor,
      currency: input.booking.currency,
      externalReference: null,
    });
    this.conversations.push({
      id: randomUUID(),
      bookingId: input.booking.id,
      memberUserIds: [...input.memberUserIds],
      createdAt: input.booking.requestedAt,
    });
    this.idempotency.push({
      actorUserId: input.booking.customerId,
      key: input.idempotency.key,
      requestHash: input.idempotency.requestHash,
      responseBody: input.idempotency.responseBody,
    });
    this.pushAudit({
      actorUserId: input.booking.customerId,
      action: input.auditAction,
      entityType: "booking",
      entityId: input.booking.id,
      metadata: { status: "requested" },
    });
    return { ...input.booking };
  }

  async getBooking(id: string): Promise<BookingRecord | null> {
    const booking = this.bookings.find((row) => row.id === id);
    return booking ? { ...booking } : null;
  }

  async listBookingsForCustomer(userId: string): Promise<BookingRecord[]> {
    return this.bookings.filter((row) => row.customerId === userId).map((row) => ({ ...row }));
  }

  async listBookingsForCompanion(profileId: string): Promise<BookingRecord[]> {
    return this.bookings.filter((row) => row.companionProfileId === profileId).map((row) => ({ ...row }));
  }

  async listAllBookings(): Promise<BookingRecord[]> {
    return this.bookings.map((row) => ({ ...row }));
  }

  async transitionBooking(id: string, change: BookingTransition): Promise<BookingRecord> {
    const booking = this.bookings.find((row) => row.id === id);
    if (!booking || booking.status !== change.from) {
      throw new DomainError("INVALID_TRANSITION", `Cannot move this booking from ${booking?.status ?? "missing"} to ${change.to}.`, 409);
    }
    if ((change.to === "accepted" || change.to === "hold") && this.overlapsBlocking(booking.companionProfileId, booking.startsAt, booking.endsAt, booking.id)) {
      throw new DomainError("BOOKING_CONFLICT", "That companion already has an accepted or held booking in this window.", 409);
    }
    const now = new Date();
    booking.status = change.to;
    if (change.to === "accepted") booking.acceptedAt = now;
    if (change.to === "hold") booking.holdExpiresAt = change.holdExpiresAt ?? null;
    if (change.to === "declined") booking.declinedAt = now;
    if (change.to === "cancelled") {
      booking.cancelledAt = now;
      booking.cancelledByUserId = change.cancelledByUserId ?? change.actorUserId;
    }
    if (change.to === "completed") booking.completedAt = now;
    if (change.to === "expired") booking.expiredAt = now;
    this.pushAudit({
      actorUserId: change.actorUserId,
      action: `booking.${change.to}`,
      entityType: "booking",
      entityId: booking.id,
      metadata: { from: change.from, to: change.to },
    });
    return { ...booking };
  }

  async expireDueHolds(now: Date): Promise<number> {
    let count = 0;
    for (const booking of this.bookings) {
      if (booking.status === "hold" && booking.holdExpiresAt && booking.holdExpiresAt.getTime() <= now.getTime()) {
        booking.status = "expired";
        booking.expiredAt = now;
        count += 1;
        this.pushAudit({
          actorUserId: null,
          action: "booking.expired",
          entityType: "booking",
          entityId: booking.id,
          metadata: { reason: "hold_expired" },
        });
      }
    }
    return count;
  }

  async findIdempotency(actorUserId: string, key: string): Promise<IdempotencyRow | null> {
    const row = this.idempotency.find((item) => item.actorUserId === actorUserId && item.key === key);
    return row ? { ...row } : null;
  }

  async listConversations(userId: string): Promise<ConversationSummary[]> {
    return this.conversations
      .filter((conversation) => conversation.memberUserIds.includes(userId))
      .map((conversation) => this.summarize(conversation))
      .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
  }

  async listMessages(conversationId: string): Promise<MessageRecord[]> {
    return this.messages.filter((message) => message.conversationId === conversationId).map((message) => ({ ...message }));
  }

  async addMessage(conversationId: string, senderUserId: string, body: string): Promise<MessageRecord> {
    const conversation = this.conversations.find((row) => row.id === conversationId);
    if (!conversation || !conversation.memberUserIds.includes(senderUserId)) {
      throw new DomainError("NOT_FOUND", "Conversation not found.", 404);
    }
    const message: MessageRecord = { id: randomUUID(), conversationId, senderUserId, body, createdAt: new Date() };
    this.messages.push(message);
    return { ...message };
  }

  async conversationMemberIds(conversationId: string): Promise<string[]> {
    return this.conversations.find((row) => row.id === conversationId)?.memberUserIds.slice() ?? [];
  }

  async createReport(input: NewReport): Promise<ReportRecord> {
    const report: ReportRecord = { id: randomUUID(), status: "open", createdAt: new Date(), ...input };
    this.reports.push(report);
    this.pushAudit({
      actorUserId: input.reporterUserId,
      action: "safety.report",
      entityType: "report",
      entityId: report.id,
      metadata: { category: input.category },
    });
    return { ...report };
  }

  async createBlock(blockerUserId: string, blockedUserId: string): Promise<{ alreadyBlocked: boolean }> {
    if (blockerUserId === blockedUserId) {
      throw new DomainError("INVALID_BLOCK", "You cannot block yourself.", 422);
    }
    if (await this.hasBlock(blockerUserId, blockedUserId)) return { alreadyBlocked: true };
    this.blocks.push({ blockerUserId, blockedUserId });
    this.pushAudit({
      actorUserId: blockerUserId,
      action: "safety.block",
      entityType: "block",
      entityId: blockedUserId,
      metadata: null,
    });
    return { alreadyBlocked: false };
  }

  async createCheckIn(input: NewCheckIn): Promise<CheckInRecord> {
    const checkIn: CheckInRecord = { id: randomUUID(), monitored: false, createdAt: new Date(), ...input };
    this.checkIns.push(checkIn);
    return { ...checkIn };
  }

  async listCheckIns(bookingId: string): Promise<CheckInRecord[]> {
    return this.checkIns.filter((row) => row.bookingId === bookingId).map((row) => ({ ...row }));
  }

  async createReview(input: NewReview): Promise<ReviewRecord> {
    if (this.reviews.some((review) => review.bookingId === input.bookingId && review.authorUserId === input.authorUserId)) {
      throw new DomainError("REVIEW_EXISTS", "You already reviewed this booking.", 409);
    }
    const review: ReviewRecord = { id: randomUUID(), createdAt: new Date(), ...input };
    this.reviews.push(review);
    return { ...review };
  }

  async listReviewsForBooking(bookingId: string): Promise<ReviewRecord[]> {
    return this.reviews.filter((review) => review.bookingId === bookingId).map((review) => ({ ...review }));
  }

  async findReview(bookingId: string, authorUserId: string): Promise<ReviewRecord | null> {
    const review = this.reviews.find((row) => row.bookingId === bookingId && row.authorUserId === authorUserId);
    return review ? { ...review } : null;
  }

  async writeAudit(entry: NewAudit): Promise<void> {
    this.pushAudit(entry);
  }

  async listAudit(limit: number): Promise<AuditEntry[]> {
    return this.audits
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((row) => ({ ...row }));
  }

  async getPaymentForBooking(bookingId: string): Promise<PaymentRecord | null> {
    const payment = this.payments.find((row) => row.bookingId === bookingId);
    return payment ? { ...payment } : null;
  }

  async getVerification(userId: string): Promise<VerificationRecord | null> {
    const row = this.verifications.find((item) => item.userId === userId);
    return row ? { ...row } : null;
  }

  private overlapsBlocking(profileId: string, startsAt: Date, endsAt: Date, exceptId?: string): boolean {
    return this.bookings.some(
      (booking) =>
        booking.id !== exceptId &&
        booking.companionProfileId === profileId &&
        (booking.status === "accepted" || booking.status === "hold") &&
        rangesOverlap(booking.startsAt, booking.endsAt, startsAt, endsAt),
    );
  }

  private summarize(conversation: ConversationRecord): ConversationSummary {
    const messages = this.messages.filter((message) => message.conversationId === conversation.id);
    const last = messages[messages.length - 1];
    return {
      id: conversation.id,
      bookingId: conversation.bookingId,
      memberUserIds: [...conversation.memberUserIds],
      lastMessageAt: last ? last.createdAt.toISOString() : null,
      lastMessagePreview: last ? last.body.slice(0, 140) : null,
    };
  }

  private pushAudit(entry: NewAudit): void {
    this.audits.push({ id: randomUUID(), createdAt: new Date(), ...entry });
  }
}
