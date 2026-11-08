import { Prisma } from "../generated/prisma/client";
import { DomainError, isExclusionViolation } from "../domain/errors";
import type {
  AuditEntry,
  AvailabilityWindow,
  BookingRecord,
  BookingStatus,
  BookingTransition,
  CheckInRecord,
  ConversationSummary,
  FeePolicy,
  IdempotencyRow,
  MessageRecord,
  PaymentRecord,
  PaymentStatus,
  PublicCompanion,
  ReportRecord,
  RequestedBookingWrite,
  ReviewRecord,
  UserRecord,
  UserRole,
  VerificationRecord,
  VerificationStatus,
} from "../domain/types";
import type { HangwiseData, NewAudit, NewCheckIn, NewReport, NewReview } from "./hangwise-data";
import type { PrismaService } from "../prisma/prisma.service";

type Db = PrismaService["client"];

export class PrismaHangwiseData implements HangwiseData {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): Db {
    return this.prisma.client;
  }

  async getUser(id: string): Promise<UserRecord | null> {
    const user = await this.db.user.findFirst({ where: { id, deletedAt: null } });
    return user
      ? {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role as UserRole,
          isDemo: user.isDemo,
          deletedAt: user.deletedAt,
        }
      : null;
  }

  async listListedCompanions(city?: string): Promise<PublicCompanion[]> {
    const rows = await this.db.companionProfile.findMany({
      where: {
        status: "listed",
        ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
      },
      orderBy: { publicName: "asc" },
    });
    return rows.map(mapCompanion);
  }

  async getCompanion(id: string): Promise<PublicCompanion | null> {
    const row = await this.db.companionProfile.findUnique({ where: { id } });
    return row ? mapCompanion(row) : null;
  }

  async getCompanionByUserId(userId: string): Promise<PublicCompanion | null> {
    const row = await this.db.companionProfile.findUnique({ where: { userId } });
    return row ? mapCompanion(row) : null;
  }

  async listAvailability(companionProfileId: string): Promise<AvailabilityWindow[]> {
    const rows = await this.db.availability.findMany({
      where: { companionProfileId },
      orderBy: { startsAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      companionProfileId: row.companionProfileId,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
    }));
  }

  async hasBlock(leftUserId: string, rightUserId: string): Promise<boolean> {
    const block = await this.db.block.findFirst({
      where: {
        OR: [
          { blockerUserId: leftUserId, blockedUserId: rightUserId },
          { blockerUserId: rightUserId, blockedUserId: leftUserId },
        ],
      },
    });
    return Boolean(block);
  }

  async requestBooking(input: RequestedBookingWrite): Promise<BookingRecord> {
    try {
      return await this.db.$transaction(async (tx) => {
        const overlap = await overlappingIds(tx, input.booking.companionProfileId, input.booking.startsAt, input.booking.endsAt);
        if (overlap.length) {
          throw new DomainError("BOOKING_CONFLICT", "That companion already has an accepted or held booking in this window.", 409);
        }
        const created = await tx.booking.create({
          data: {
            id: input.booking.id,
            customerId: input.booking.customerId,
            companionProfileId: input.booking.companionProfileId,
            venueName: input.booking.venueName,
            venueArea: input.booking.venueArea,
            startsAt: input.booking.startsAt,
            endsAt: input.booking.endsAt,
            status: "requested",
            priceMinor: input.booking.priceMinor,
            currency: input.booking.currency,
            platformFeeMinor: input.booking.platformFeeMinor,
            feePolicy: input.booking.feePolicy,
            customerNote: input.booking.customerNote,
            requestedAt: input.booking.requestedAt,
          },
        });
        await tx.payment.create({
          data: {
            bookingId: created.id,
            status: "unavailable",
            provider: "unconfigured",
            amountMinor: created.priceMinor,
            currency: created.currency,
          },
        });
        await tx.conversation.create({
          data: {
            bookingId: created.id,
            members: { create: input.memberUserIds.map((userId) => ({ userId })) },
          },
        });
        await tx.idempotencyRecord.create({
          data: {
            actorUserId: input.booking.customerId,
            idempotencyKey: input.idempotency.key,
            requestHash: input.idempotency.requestHash,
            responseBody: input.idempotency.responseBody as Prisma.InputJsonValue,
          },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: input.booking.customerId,
            action: input.auditAction,
            entityType: "booking",
            entityId: created.id,
            metadata: { status: "requested" },
          },
        });
        return mapBooking(created);
      });
    } catch (error) {
      if (error instanceof DomainError) throw error;
      if (isExclusionViolation(error)) {
        throw new DomainError("BOOKING_CONFLICT", "That companion already has an accepted or held booking in this window.", 409);
      }
      throw error;
    }
  }

  async getBooking(id: string): Promise<BookingRecord | null> {
    const row = await this.db.booking.findUnique({ where: { id } });
    return row ? mapBooking(row) : null;
  }

  async listBookingsForCustomer(userId: string): Promise<BookingRecord[]> {
    const rows = await this.db.booking.findMany({ where: { customerId: userId } });
    return rows.map(mapBooking);
  }

  async listBookingsForCompanion(profileId: string): Promise<BookingRecord[]> {
    const rows = await this.db.booking.findMany({ where: { companionProfileId: profileId } });
    return rows.map(mapBooking);
  }

  async listAllBookings(): Promise<BookingRecord[]> {
    const rows = await this.db.booking.findMany();
    return rows.map(mapBooking);
  }

  async transitionBooking(id: string, change: BookingTransition): Promise<BookingRecord> {
    try {
      return await this.db.$transaction(async (tx) => {
        const current = await tx.booking.findUnique({ where: { id } });
        if (!current || current.status !== change.from) {
          throw new DomainError(
            "INVALID_TRANSITION",
            `Cannot move this booking from ${current?.status ?? "missing"} to ${change.to}.`,
            409,
          );
        }
        if (change.to === "accepted" || change.to === "hold") {
          const overlap = await overlappingIds(tx, current.companionProfileId, current.startsAt, current.endsAt, current.id);
          if (overlap.length) {
            throw new DomainError("BOOKING_CONFLICT", "That companion already has an accepted or held booking in this window.", 409);
          }
        }
        const now = new Date();
        const updated = await tx.booking.updateMany({
          where: { id, status: change.from },
          data: {
            status: change.to,
            acceptedAt: change.to === "accepted" ? now : undefined,
            holdExpiresAt: change.to === "hold" ? change.holdExpiresAt : undefined,
            declinedAt: change.to === "declined" ? now : undefined,
            cancelledAt: change.to === "cancelled" ? now : undefined,
            cancelledByUserId: change.to === "cancelled" ? (change.cancelledByUserId ?? change.actorUserId) : undefined,
            completedAt: change.to === "completed" ? now : undefined,
            expiredAt: change.to === "expired" ? now : undefined,
          },
        });
        if (updated.count !== 1) {
          throw new DomainError("INVALID_TRANSITION", `Cannot move this booking to ${change.to}.`, 409);
        }
        const fresh = await tx.booking.findUniqueOrThrow({ where: { id } });
        await tx.auditLog.create({
          data: {
            actorUserId: change.actorUserId,
            action: `booking.${change.to}`,
            entityType: "booking",
            entityId: id,
            metadata: { from: change.from, to: change.to },
          },
        });
        return mapBooking(fresh);
      });
    } catch (error) {
      if (error instanceof DomainError) throw error;
      if (isExclusionViolation(error)) {
        throw new DomainError("BOOKING_CONFLICT", "That companion already has an accepted or held booking in this window.", 409);
      }
      throw error;
    }
  }

  async expireDueHolds(now: Date): Promise<number> {
    const due = await this.db.booking.findMany({ where: { status: "hold", holdExpiresAt: { lte: now } } });
    let count = 0;
    for (const booking of due) {
      const updated = await this.db.booking.updateMany({
        where: { id: booking.id, status: "hold", holdExpiresAt: { lte: now } },
        data: { status: "expired", expiredAt: now },
      });
      if (updated.count === 1) {
        count += 1;
        await this.writeAudit({
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
    const row = await this.db.idempotencyRecord.findUnique({
      where: { actorUserId_idempotencyKey: { actorUserId, idempotencyKey: key } },
    });
    if (!row) return null;
    return { actorUserId: row.actorUserId, key: row.idempotencyKey, requestHash: row.requestHash, responseBody: row.responseBody };
  }

  async listConversations(userId: string): Promise<ConversationSummary[]> {
    const memberships = await this.db.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: true,
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });
    return memberships
      .map((membership) => {
        const last = membership.conversation.messages[0];
        return {
          id: membership.conversation.id,
          bookingId: membership.conversation.bookingId,
          memberUserIds: membership.conversation.members.map((member) => member.userId),
          lastMessageAt: last ? last.createdAt.toISOString() : null,
          lastMessagePreview: last ? last.body.slice(0, 140) : null,
        };
      })
      .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
  }

  async listMessages(conversationId: string): Promise<MessageRecord[]> {
    const rows = await this.db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
    return rows.map(mapMessage);
  }

  async addMessage(conversationId: string, senderUserId: string, body: string): Promise<MessageRecord> {
    const member = await this.db.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: senderUserId } },
    });
    if (!member) throw new DomainError("NOT_FOUND", "Conversation not found.", 404);
    const message = await this.db.message.create({ data: { conversationId, senderUserId, body } });
    return mapMessage(message);
  }

  async conversationMemberIds(conversationId: string): Promise<string[]> {
    const rows = await this.db.conversationMember.findMany({ where: { conversationId } });
    return rows.map((row) => row.userId);
  }

  async createReport(input: NewReport): Promise<ReportRecord> {
    const report = await this.db.report.create({
      data: {
        reporterUserId: input.reporterUserId,
        subjectUserId: input.subjectUserId,
        bookingId: input.bookingId,
        category: input.category,
        body: input.body,
        status: "open",
      },
    });
    await this.writeAudit({
      actorUserId: input.reporterUserId,
      action: "safety.report",
      entityType: "report",
      entityId: report.id,
      metadata: { category: input.category },
    });
    return {
      id: report.id,
      reporterUserId: report.reporterUserId,
      subjectUserId: report.subjectUserId,
      bookingId: report.bookingId,
      category: report.category,
      body: report.body,
      status: "open",
      createdAt: report.createdAt,
    };
  }

  async createBlock(blockerUserId: string, blockedUserId: string): Promise<{ alreadyBlocked: boolean }> {
    if (blockerUserId === blockedUserId) throw new DomainError("INVALID_BLOCK", "You cannot block yourself.", 422);
    const existing = await this.db.block.findUnique({
      where: { blockerUserId_blockedUserId: { blockerUserId, blockedUserId } },
    });
    if (existing) return { alreadyBlocked: true };
    await this.db.block.create({ data: { blockerUserId, blockedUserId } });
    await this.writeAudit({
      actorUserId: blockerUserId,
      action: "safety.block",
      entityType: "block",
      entityId: blockedUserId,
      metadata: null,
    });
    return { alreadyBlocked: false };
  }

  async createCheckIn(input: NewCheckIn): Promise<CheckInRecord> {
    const row = await this.db.checkIn.create({
      data: { bookingId: input.bookingId, userId: input.userId, note: input.note, monitored: false },
    });
    return { id: row.id, bookingId: row.bookingId, userId: row.userId, note: row.note, monitored: false, createdAt: row.createdAt };
  }

  async listCheckIns(bookingId: string): Promise<CheckInRecord[]> {
    const rows = await this.db.checkIn.findMany({ where: { bookingId }, orderBy: { createdAt: "asc" } });
    return rows.map((row) => ({
      id: row.id,
      bookingId: row.bookingId,
      userId: row.userId,
      note: row.note,
      monitored: false,
      createdAt: row.createdAt,
    }));
  }

  async createReview(input: NewReview): Promise<ReviewRecord> {
    try {
      const review = await this.db.review.create({
        data: {
          bookingId: input.bookingId,
          authorUserId: input.authorUserId,
          rating: input.rating,
          body: input.body,
        },
      });
      return mapReview(review);
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        throw new DomainError("REVIEW_EXISTS", "You already reviewed this booking.", 409);
      }
      throw error;
    }
  }

  async listReviewsForBooking(bookingId: string): Promise<ReviewRecord[]> {
    const rows = await this.db.review.findMany({ where: { bookingId }, orderBy: { createdAt: "asc" } });
    return rows.map(mapReview);
  }

  async findReview(bookingId: string, authorUserId: string): Promise<ReviewRecord | null> {
    const row = await this.db.review.findUnique({ where: { bookingId_authorUserId: { bookingId, authorUserId } } });
    return row ? mapReview(row) : null;
  }

  async writeAudit(entry: NewAudit): Promise<void> {
    await this.db.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata === null ? Prisma.JsonNull : (entry.metadata as Prisma.InputJsonValue),
      },
    });
  }

  async listAudit(limit: number): Promise<AuditEntry[]> {
    const rows = await this.db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
    return rows.map((row) => ({
      id: row.id,
      actorUserId: row.actorUserId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? (row.metadata as Record<string, unknown>) : null,
      createdAt: row.createdAt,
    }));
  }

  async getPaymentForBooking(bookingId: string): Promise<PaymentRecord | null> {
    const row = await this.db.payment.findUnique({ where: { bookingId } });
    if (!row) return null;
    return {
      id: row.id,
      bookingId: row.bookingId,
      status: row.status as PaymentStatus,
      provider: row.provider,
      amountMinor: row.amountMinor,
      currency: row.currency,
      externalReference: row.externalReference,
    };
  }

  async getVerification(userId: string): Promise<VerificationRecord | null> {
    const row = await this.db.verificationReference.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      kind: row.kind,
      provider: row.provider,
      status: row.status as VerificationStatus,
      externalReference: row.externalReference,
    };
  }
}

async function overlappingIds(
  tx: Pick<Db, "$queryRaw">,
  companionProfileId: string,
  startsAt: Date,
  endsAt: Date,
  exceptId?: string,
): Promise<Array<{ id: string }>> {
  if (exceptId) {
    return tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM bookings
      WHERE companion_profile_id = CAST(${companionProfileId} AS uuid)
        AND id <> CAST(${exceptId} AS uuid)
        AND status::text IN ('accepted', 'hold')
        AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${startsAt}, ${endsAt}, '[)')
    `;
  }
  return tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM bookings
    WHERE companion_profile_id = CAST(${companionProfileId} AS uuid)
      AND status::text IN ('accepted', 'hold')
      AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${startsAt}, ${endsAt}, '[)')
  `;
}

function mapCompanion(row: {
  id: string;
  userId: string;
  publicName: string;
  ageYears: number;
  headline: string;
  bio: string;
  city: string;
  area: string;
  status: string;
  hourlyRateMinor: number;
  currency: string;
  languages: string[];
  boundaries: string;
}): PublicCompanion {
  return {
    id: row.id,
    userId: row.userId,
    publicName: row.publicName,
    ageYears: row.ageYears,
    headline: row.headline,
    bio: row.bio,
    city: row.city,
    area: row.area,
    status: row.status as PublicCompanion["status"],
    hourlyRateMinor: row.hourlyRateMinor,
    currency: row.currency.trim(),
    languages: row.languages,
    boundaries: row.boundaries,
  };
}

function mapBooking(row: {
  id: string;
  customerId: string;
  companionProfileId: string;
  venueName: string;
  venueArea: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  priceMinor: number;
  currency: string;
  platformFeeMinor: number | null;
  feePolicy: string;
  customerNote: string | null;
  holdExpiresAt: Date | null;
  requestedAt: Date;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  cancelledAt: Date | null;
  completedAt: Date | null;
  expiredAt: Date | null;
  cancelledByUserId: string | null;
}): BookingRecord {
  return {
    id: row.id,
    customerId: row.customerId,
    companionProfileId: row.companionProfileId,
    venueName: row.venueName,
    venueArea: row.venueArea,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status as BookingStatus,
    priceMinor: row.priceMinor,
    currency: row.currency.trim(),
    platformFeeMinor: row.platformFeeMinor,
    feePolicy: row.feePolicy as FeePolicy,
    customerNote: row.customerNote,
    holdExpiresAt: row.holdExpiresAt,
    requestedAt: row.requestedAt,
    acceptedAt: row.acceptedAt,
    declinedAt: row.declinedAt,
    cancelledAt: row.cancelledAt,
    completedAt: row.completedAt,
    expiredAt: row.expiredAt,
    cancelledByUserId: row.cancelledByUserId,
  };
}

function mapMessage(row: MessageRecord): MessageRecord {
  return { ...row };
}

function mapReview(row: ReviewRecord): ReviewRecord {
  return { ...row };
}
