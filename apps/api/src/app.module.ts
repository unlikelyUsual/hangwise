import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { AdminModule } from "./admin/admin.module";
import { DevAuthGuard } from "./auth/dev-auth.guard";
import { BookingsModule } from "./bookings/bookings.module";
import { ChatModule } from "./chat/chat.module";
import { ApiExceptionFilter } from "./common/api-exception.filter";
import { RateLimitGuard } from "./common/rate-limit.guard";
import { CompanionsModule } from "./companions/companions.module";
import { ConfigModule } from "./config/config.module";
import { DataModule } from "./data/data.module";
import { HealthModule } from "./health/health.module";
import { PaymentsModule } from "./payments/payments.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProvidersModule } from "./providers/providers.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { SafetyModule } from "./safety/safety.module";
import { UsersModule } from "./users/users.module";
import { VerificationModule } from "./verification/verification.module";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    DataModule,
    ProvidersModule,
    HealthModule,
    UsersModule,
    CompanionsModule,
    BookingsModule,
    ChatModule,
    PaymentsModule,
    VerificationModule,
    SafetyModule,
    ReviewsModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: DevAuthGuard },
  ],
})
export class AppModule {}
