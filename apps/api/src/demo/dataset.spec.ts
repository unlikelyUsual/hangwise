import { rangesOverlap } from "../domain/overlap";
import { buildDemoDataset } from "./dataset";
import { DemoBookingIds } from "./dataset";

describe("demo dataset", () => {
  const dataset = buildDemoDataset(new Date("2026-11-08T02:00:00.000Z"));

  it("keeps accepted and held bookings from overlapping and leaves one conflicting request", () => {
    const blocking = dataset.bookings.filter((booking) => booking.status === "accepted" || booking.status === "hold");
    for (let i = 0; i < blocking.length; i += 1) {
      for (let j = i + 1; j < blocking.length; j += 1) {
        if (blocking[i].companionProfileId === blocking[j].companionProfileId) {
          expect(rangesOverlap(blocking[i].startsAt, blocking[i].endsAt, blocking[j].startsAt, blocking[j].endsAt)).toBe(false);
        }
      }
    }
    const accepted = dataset.bookings.find((booking) => booking.id === DemoBookingIds.mayaAccepted);
    const overlap = dataset.bookings.find((booking) => booking.id === DemoBookingIds.mayaOverlapRequest);
    expect(overlap?.status).toBe("requested");
    expect(rangesOverlap(accepted!.startsAt, accepted!.endsAt, overlap!.startsAt, overlap!.endsAt)).toBe(true);
  });

  it("stores sample prices with an unknown fee and unavailable payments", () => {
    expect(dataset.bookings.every((booking) => booking.feePolicy === "unknown" && booking.platformFeeMinor === null)).toBe(true);
    expect(dataset.payments.every((payment) => payment.status === "unavailable" && payment.externalReference === null)).toBe(true);
    expect(dataset.privateProfiles.every((profile) => profile.phoneE164 === null && profile.termsAcceptedAt === null)).toBe(true);
    expect(dataset.verifications.every((row) => row.status === "unavailable")).toBe(true);
    const maya = dataset.bookings.find((booking) => booking.id === DemoBookingIds.mayaRequested);
    expect(maya?.priceMinor).toBe(300_000);
    expect(maya?.currency).toBe("THB");
  });
});
