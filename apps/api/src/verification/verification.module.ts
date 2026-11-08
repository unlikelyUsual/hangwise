import { Body, Controller, Get, Inject, Module, Post } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { CurrentActor } from "../auth/current-actor.decorator";
import { HANGWISE_DATA, type HangwiseData } from "../data/hangwise-data";
import type { Actor } from "../domain/types";
import { UnavailableVerificationProvider } from "../providers/providers";

class StartVerificationDto {}

@ApiTags("verification")
@ApiSecurity("devUser")
@ApiSecurity("devSecret")
@Controller("v1/verification")
export class VerificationController {
  constructor(
    private readonly verification: UnavailableVerificationProvider,
    @Inject(HANGWISE_DATA) private readonly data: HangwiseData,
  ) {}

  @Get("me")
  async me(@CurrentActor() actor: Actor) {
    const row = await this.data.getVerification(actor.userId);
    return {
      demo: true,
      collectsGovernmentId: false,
      status: row?.status ?? "unavailable",
      provider: row?.provider ?? "unconfigured",
      externalReference: row?.externalReference ?? null,
    };
  }

  @Post("start")
  start(@Body() _body: StartVerificationDto): Promise<never> {
    return this.verification.start();
  }
}

@Module({ controllers: [VerificationController] })
export class VerificationModule {}
