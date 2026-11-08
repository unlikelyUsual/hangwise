import { Controller, Get, Inject, Module } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { CurrentActor } from "../auth/current-actor.decorator";
import { HANGWISE_DATA, type HangwiseData } from "../data/hangwise-data";
import { DomainError } from "../domain/errors";
import type { Actor } from "../domain/types";

@ApiTags("users")
@ApiSecurity("devUser")
@ApiSecurity("devSecret")
@Controller("v1/me")
export class UsersController {
  constructor(@Inject(HANGWISE_DATA) private readonly data: HangwiseData) {}

  @Get()
  async me(@CurrentActor() actor: Actor) {
    const user = await this.data.getUser(actor.userId);
    if (!user) throw new DomainError("AUTH_REQUIRED", "Development authentication was rejected.", 401);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isDemo: user.isDemo,
      demo: true,
      identityVerified: false,
      payments: "disabled",
    };
  }
}

@Module({ controllers: [UsersController] })
export class UsersModule {}
