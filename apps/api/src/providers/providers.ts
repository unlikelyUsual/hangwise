import { Injectable } from "@nestjs/common";
import { DomainError } from "../domain/errors";

@Injectable()
export class UnavailablePaymentProvider {
  readonly name = "unconfigured" as const;

  async createCharge(): Promise<never> {
    throw new DomainError("PAYMENTS_UNAVAILABLE", "Payments are disabled. No charge was created.", 501);
  }
}

@Injectable()
export class UnavailableVerificationProvider {
  readonly name = "unconfigured" as const;

  async start(): Promise<never> {
    throw new DomainError(
      "VERIFICATION_UNAVAILABLE",
      "Identity verification is not configured. Do not send identity documents.",
      501,
    );
  }
}

@Injectable()
export class UnconfiguredNotificationProvider {
  readonly name = "unconfigured" as const;

  async send(): Promise<{ delivered: false; reason: "not_configured" }> {
    return { delivered: false, reason: "not_configured" };
  }
}

@Injectable()
export class RefusingObjectStorage {
  readonly name = "unconfigured" as const;

  async put(): Promise<never> {
    throw new DomainError(
      "STORAGE_UNAVAILABLE",
      "File storage is not configured. This skeleton does not accept identity documents or images.",
      501,
    );
  }
}
