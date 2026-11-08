import type { Env } from "../config/env";
import { MemoryHangwiseData } from "../data/memory-hangwise-data";
import type { Actor } from "../domain/types";
import { addDays, bangkokDate, buildDemoDataset, DemoBookingIds, DemoProfileIds, slotOn } from "../demo/dataset";
import { DemoUserIds } from "../demo/personas";
import { BookingsService } from "./bookings.service";

const env: Env = {
  nodeEnv: "test",
  host: "127.0.0.1",
  port: 0,
  databaseUrl: "postgresql://hangwise:hangwise@127.0.0.1:5433/hangwise",
  authMode: "development",
  devAuthSecret: "hangwise-dev-secret",
  corsOrigins: [],
  demoMode: true,
  paymentsMode: "disabled",
  verificationMode: "unavailable",
  repository: "memory",
  platformFeeBps: null,
  rateLimitMax: 100,
  rateLimitWindowMs: 60_000,
};

const fixedNow = new Date("2026-11-08T02:00:00.000Z");

function harness(platformFeeBps: number | null = null) {
  const dataset = buildDemoDataset(fixedNow);
  const data = new MemoryHangwiseData(dataset);
  const service = new BookingsService(data, { ...env, platformFeeBps });
  const actor = (id: string): Actor => {
    const user = dataset.users.find((row) => row.id === id);
    if (!user) throw new Error(`missing ${id}`);
    return { userId: user.id, role: user.role, displayName: user.displayName, isDemo: true };
  };
  return { data, service, actor };
}

describe("BookingsService", () => {
  it("rejects accepting an overlapping request and allows the non-overlapping one", async () => {
    const { service, actor } = harness();
    await expect(service.accept(actor(DemoUserIds.maya), DemoBookingIds.mayaOverlapRequest)).rejects.toMatchObject({
      code: "BOOKING_CONFLICT",
      status: 409,
    });
    const accepted = await service.accept(actor(DemoUserIds.maya), DemoBookingIds.mayaRequested);
    expect(accepted.status).toBe("accepted");
    expect(accepted.paymentAuthorized).toBe(false);
  });

  it("hides bookings the actor does not participate in and refuses a customer accept", async () => {
    const { service, actor } = harness();
    await expect(service.get(actor(DemoUserIds.priya), DemoBookingIds.kenjiDeclined)).rejects.toMatchObject({ status: 404 });
    await expect(service.accept(actor(DemoUserIds.alex), DemoBookingIds.kenjiDeclined)).rejects.toMatchObject({ status: 403 });
  });

  it("snapshots the listed rate, replays the same idempotency key, and rejects a mismatched retry", async () => {
    const { service, actor, data } = harness();
    const slot = slotOn(addDays(bangkokDate(fixedNow), 6), 10, 2);
    const input = {
      companionProfileId: DemoProfileIds.maya,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      venueName: "Lumpini Park",
      venueArea: "Pathum Wan",
      note: "A public walk.",
      acknowledgedPublicDatePolicy: true as const,
    };
    const created = await service.create(actor(DemoUserIds.alex), input, "idem-key-1");
    expect(created.price.minor).toBe(300_000);
    expect(created.price.feePolicy).toBe("unknown");
    expect(created.price.platformFeeMinor).toBeNull();
    const replay = await service.create(actor(DemoUserIds.alex), input, "idem-key-1");
    expect(replay.id).toBe(created.id);
    await expect(service.create(actor(DemoUserIds.alex), { ...input, note: "Different note." }, "idem-key-1")).rejects.toMatchObject({
      code: "IDEMPOTENCY_MISMATCH",
    });
    expect((await data.getPaymentForBooking(created.id))?.status).toBe("unavailable");
  });

  it("uses a configured fee only when basis points are set", async () => {
    const { service, actor } = harness(1000);
    const slot = slotOn(addDays(bangkokDate(fixedNow), 6), 13, 2);
    const created = await service.create(
      actor(DemoUserIds.alex),
      {
        companionProfileId: DemoProfileIds.arun,
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        venueName: "Benjakitti Park",
        venueArea: "Khlong Toei",
        acknowledgedPublicDatePolicy: true,
      },
      "fee-configured-1",
    );
    expect(created.price.minor).toBe(240_000);
    expect(created.price.platformFeeMinor).toBe(24_000);
    expect(created.price.feePolicy).toBe("configured");
  });

  it("lets two customers request the same slot and accepts only one", async () => {
    const { service, actor } = harness();
    const slot = slotOn(addDays(bangkokDate(fixedNow), 7), 10, 2);
    const body = {
      companionProfileId: DemoProfileIds.lena,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      venueName: "Lumpini Park",
      venueArea: "Pathum Wan",
      acknowledgedPublicDatePolicy: true as const,
    };
    const first = await service.create(actor(DemoUserIds.alex), body, "shared-slot-alex");
    const second = await service.create(actor(DemoUserIds.priya), body, "shared-slot-priya");
    await service.accept(actor(DemoUserIds.lena), first.id);
    await expect(service.accept(actor(DemoUserIds.lena), second.id)).rejects.toMatchObject({ code: "BOOKING_CONFLICT" });
  });

  it("does not authorize money when a booking is held, and can expire that hold", async () => {
    const { service, actor, data } = harness();
    const slot = slotOn(addDays(bangkokDate(fixedNow), 6), 10, 2);
    const created = await service.create(
      actor(DemoUserIds.alex),
      {
        companionProfileId: DemoProfileIds.kenji,
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        venueName: "Paper Lantern Café",
        venueArea: "Phra Nakhon",
        acknowledgedPublicDatePolicy: true,
      },
      "hold-demo-1",
    );
    await service.accept(actor(DemoUserIds.kenji), created.id);
    const held = await service.hold(actor(DemoUserIds.kenji), created.id, 30);
    expect(held.status).toBe("hold");
    expect(held.paymentAuthorized).toBe(false);
    expect((await data.getPaymentForBooking(created.id))?.status).toBe("unavailable");
    await expect(service.complete(actor(DemoUserIds.kenji), created.id)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    const expired = await service.expireDueHolds(new Date("2099-01-01T00:00:00.000Z"));
    expect(expired).toBeGreaterThanOrEqual(1);
    expect((await data.getBooking(created.id))?.status).toBe("expired");
  });

  it("rejects requests outside availability, in the past, or from a blocked pair", async () => {
    const { service, actor, data } = harness();
    const alex = actor(DemoUserIds.alex);
    const outside = slotOn(addDays(bangkokDate(fixedNow), 6), 10, 2);
    await expect(
      service.create(
        alex,
        {
          companionProfileId: DemoProfileIds.maya,
          startsAt: "2020-01-01T03:00:00.000Z",
          endsAt: "2020-01-01T05:00:00.000Z",
          venueName: "Lumpini Park",
          venueArea: "Pathum Wan",
          acknowledgedPublicDatePolicy: true,
        },
        "past-window-1",
      ),
    ).rejects.toMatchObject({ code: "INVALID_WINDOW" });
    await expect(
      service.create(
        alex,
        {
          companionProfileId: DemoProfileIds.maya,
          startsAt: new Date(Date.UTC(2099, 0, 1, 3)).toISOString(),
          endsAt: new Date(Date.UTC(2099, 0, 1, 5)).toISOString(),
          venueName: "Lumpini Park",
          venueArea: "Pathum Wan",
          acknowledgedPublicDatePolicy: true,
        },
        "outside-window-1",
      ),
    ).rejects.toMatchObject({ code: "OUTSIDE_AVAILABILITY" });
    await data.createBlock(DemoUserIds.maya, DemoUserIds.alex);
    await expect(
      service.create(
        alex,
        {
          companionProfileId: DemoProfileIds.maya,
          startsAt: outside.startsAt.toISOString(),
          endsAt: outside.endsAt.toISOString(),
          venueName: "Lumpini Park",
          venueArea: "Pathum Wan",
          acknowledgedPublicDatePolicy: true,
        },
        "blocked-window-1",
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(service.create(actor(DemoUserIds.maya), {
      companionProfileId: DemoProfileIds.arun,
      startsAt: outside.startsAt.toISOString(),
      endsAt: outside.endsAt.toISOString(),
      venueName: "Lumpini Park",
      venueArea: "Pathum Wan",
      acknowledgedPublicDatePolicy: true,
    }, "companion-cannot-book")).rejects.toMatchObject({ status: 403 });
  });
});
