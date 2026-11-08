import { Global, Module } from "@nestjs/common";
import {
  RefusingObjectStorage,
  UnavailablePaymentProvider,
  UnavailableVerificationProvider,
  UnconfiguredNotificationProvider,
} from "./providers";

@Global()
@Module({
  providers: [UnavailablePaymentProvider, UnavailableVerificationProvider, UnconfiguredNotificationProvider, RefusingObjectStorage],
  exports: [UnavailablePaymentProvider, UnavailableVerificationProvider, UnconfiguredNotificationProvider, RefusingObjectStorage],
})
export class ProvidersModule {}
