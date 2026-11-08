import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildDemoDataset } from "../src/demo/dataset";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required to seed.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const dataset = buildDemoDataset(new Date());
  const userIds = dataset.users.map((user) => user.id);
  const profileIds = dataset.companions.map((companion) => companion.id);
  try {
    await prisma.$transaction(async (tx) => {
      for (const user of dataset.users) {
        await tx.user.upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            isDemo: true,
          },
          update: {
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            isDemo: true,
            deletedAt: null,
          },
        });
        await tx.userPrivateProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, phoneE164: null, locale: "en", countryCode: null, termsAcceptedAt: null, privacyAcceptedAt: null },
          update: { phoneE164: null, termsAcceptedAt: null, privacyAcceptedAt: null },
        });
      }
      for (const companion of dataset.companions) {
        await tx.companionProfile.upsert({
          where: { id: companion.id },
          create: {
            id: companion.id,
            userId: companion.userId,
            publicName: companion.publicName,
            ageYears: companion.ageYears,
            headline: companion.headline,
            bio: companion.bio,
            city: companion.city,
            area: companion.area,
            status: companion.status,
            hourlyRateMinor: companion.hourlyRateMinor,
            currency: companion.currency,
            languages: companion.languages,
            boundaries: companion.boundaries,
          },
          update: {
            publicName: companion.publicName,
            ageYears: companion.ageYears,
            headline: companion.headline,
            bio: companion.bio,
            city: companion.city,
            area: companion.area,
            status: companion.status,
            hourlyRateMinor: companion.hourlyRateMinor,
            currency: companion.currency,
            languages: companion.languages,
            boundaries: companion.boundaries,
          },
        });
      }

      const conversations = await tx.conversation.findMany({
        where: {
          OR: [{ booking: { customerId: { in: userIds } } }, { members: { some: { userId: { in: userIds } } } }],
        },
        select: { id: true },
      });
      const conversationIds = conversations.map((conversation) => conversation.id);
      await tx.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
      await tx.conversationMember.deleteMany({ where: { conversationId: { in: conversationIds } } });
      await tx.conversation.deleteMany({ where: { id: { in: conversationIds } } });
      await tx.review.deleteMany({ where: { authorUserId: { in: userIds } } });
      await tx.checkIn.deleteMany({ where: { userId: { in: userIds } } });
      await tx.refund.deleteMany({ where: { payment: { booking: { customerId: { in: userIds } } } } });
      await tx.payment.deleteMany({
        where: { booking: { OR: [{ customerId: { in: userIds } }, { companionProfileId: { in: profileIds } }] } },
      });
      await tx.booking.deleteMany({
        where: { OR: [{ customerId: { in: userIds } }, { companionProfileId: { in: profileIds } }] },
      });
      await tx.availability.deleteMany({ where: { companionProfileId: { in: profileIds } } });
      await tx.payout.deleteMany({ where: { companionProfileId: { in: profileIds } } });
      await tx.idempotencyRecord.deleteMany({ where: { actorUserId: { in: userIds } } });
      await tx.auditLog.deleteMany({ where: { OR: [{ actorUserId: { in: userIds } }, { actorUserId: null, action: "seed.booking" }] } });
      await tx.report.deleteMany({
        where: { OR: [{ reporterUserId: { in: userIds } }, { subjectUserId: { in: userIds } }] },
      });
      await tx.block.deleteMany({
        where: { OR: [{ blockerUserId: { in: userIds } }, { blockedUserId: { in: userIds } }] },
      });
      await tx.verificationReference.deleteMany({ where: { userId: { in: userIds } } });

      await tx.availability.createMany({
        data: dataset.availability.map((window) => ({
          id: window.id,
          companionProfileId: window.companionProfileId,
          startsAt: window.startsAt,
          endsAt: window.endsAt,
        })),
      });

      for (const booking of dataset.bookings) {
        const companion = dataset.companions.find((item) => item.id === booking.companionProfileId);
        if (!companion) throw new Error(`Missing companion for ${booking.id}`);
        const conversation = dataset.conversations.find((item) => item.bookingId === booking.id);
        if (!conversation) throw new Error(`Missing conversation for ${booking.id}`);
        await tx.booking.create({
          data: {
            id: booking.id,
            customerId: booking.customerId,
            companionProfileId: booking.companionProfileId,
            venueName: booking.venueName,
            venueArea: booking.venueArea,
            startsAt: booking.startsAt,
            endsAt: booking.endsAt,
            status: booking.status,
            priceMinor: booking.priceMinor,
            currency: booking.currency,
            platformFeeMinor: booking.platformFeeMinor,
            feePolicy: booking.feePolicy,
            customerNote: booking.customerNote,
            holdExpiresAt: booking.holdExpiresAt,
            requestedAt: booking.requestedAt,
            acceptedAt: booking.acceptedAt,
            declinedAt: booking.declinedAt,
            cancelledAt: booking.cancelledAt,
            completedAt: booking.completedAt,
            expiredAt: booking.expiredAt,
            cancelledByUserId: booking.cancelledByUserId,
            payment: {
              create: {
                status: "unavailable",
                provider: "unconfigured",
                amountMinor: booking.priceMinor,
                currency: booking.currency,
              },
            },
            conversation: {
              create: {
                id: conversation.id,
                members: { create: conversation.memberUserIds.map((userId) => ({ userId })) },
                messages: {
                  create: dataset.messages
                    .filter((message) => message.conversationId === conversation.id)
                    .map((message) => ({
                      id: message.id,
                      senderUserId: message.senderUserId,
                      body: message.body,
                      createdAt: message.createdAt,
                    })),
                },
              },
            },
          },
        });
      }

      if (dataset.reviews.length) {
        await tx.review.createMany({
          data: dataset.reviews.map((review) => ({
            id: review.id,
            bookingId: review.bookingId,
            authorUserId: review.authorUserId,
            rating: review.rating,
            body: review.body,
            createdAt: review.createdAt,
          })),
        });
      }
      if (dataset.checkIns.length) {
        await tx.checkIn.createMany({
          data: dataset.checkIns.map((checkIn) => ({
            id: checkIn.id,
            bookingId: checkIn.bookingId,
            userId: checkIn.userId,
            note: checkIn.note,
            monitored: false,
            createdAt: checkIn.createdAt,
          })),
        });
      }
      await tx.verificationReference.createMany({
        data: dataset.verifications.map((row) => ({
          id: row.id,
          userId: row.userId,
          kind: row.kind,
          provider: row.provider,
          status: row.status,
          externalReference: row.externalReference,
        })),
      });
      await tx.auditLog.createMany({
        data: dataset.audits.map((row) => ({
          id: row.id,
          actorUserId: row.actorUserId,
          action: row.action,
          entityType: row.entityType,
          entityId: row.entityId,
          metadata: row.metadata ?? undefined,
          createdAt: row.createdAt,
        })),
      });
    });
    process.stdout.write(
      `${JSON.stringify({
        seed: "demo",
        users: dataset.users.length,
        companions: dataset.companions.length,
        bookings: dataset.bookings.length,
        payments: "unavailable",
        platformFee: "unknown",
      })}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Seed failed";
  if (message.includes("postgres://") || message.includes("postgresql://")) {
    console.error("Seed failed while connecting to the database.");
  } else {
    console.error(message);
  }
  process.exit(1);
});
