import { RefusingObjectStorage, UnavailablePaymentProvider, UnavailableVerificationProvider, UnconfiguredNotificationProvider } from "./providers";

describe("placeholder providers", () => {
  it("does not pretend to charge, verify, store documents, or deliver a notification", async () => {
    await expect(new UnavailablePaymentProvider().createCharge()).rejects.toMatchObject({ code: "PAYMENTS_UNAVAILABLE", status: 501 });
    await expect(new UnavailableVerificationProvider().start()).rejects.toMatchObject({ code: "VERIFICATION_UNAVAILABLE" });
    await expect(new RefusingObjectStorage().put()).rejects.toMatchObject({ code: "STORAGE_UNAVAILABLE" });
    await expect(new UnconfiguredNotificationProvider().send()).resolves.toEqual({ delivered: false, reason: "not_configured" });
  });
});
