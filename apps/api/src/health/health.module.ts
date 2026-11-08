import { Controller, Get, Inject, Module } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ENV, type Env } from "../config/env";
import { DomainError } from "../domain/errors";
import { Public } from "../auth/public.decorator";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Controller()
export class HealthController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get("health")
  health() {
    return {
      status: "ok",
      service: "hangwise-api",
      demoMode: this.env.demoMode,
      payments: this.env.paymentsMode,
      verification: this.env.verificationMode,
      authMode: this.env.authMode,
      repository: this.env.repository,
      feePolicy: this.env.platformFeeBps == null ? "unknown" : "configured",
    };
  }

  @Public()
  @Get("health/ready")
  async ready() {
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      return { status: "ok", database: "up" };
    } catch {
      throw new DomainError("NOT_READY", "Database is not reachable.", 503);
    }
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
