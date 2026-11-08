import { Controller, Get, Inject, Module, Query } from "@nestjs/common";
import { ApiPropertyOptional, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { CurrentActor } from "../auth/current-actor.decorator";
import { HANGWISE_DATA, type HangwiseData } from "../data/hangwise-data";
import { DomainError } from "../domain/errors";
import type { Actor } from "../domain/types";

class LimitQuery {
  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

@ApiTags("admin")
@ApiSecurity("devUser")
@ApiSecurity("devSecret")
@Controller("v1/admin")
export class AdminController {
  constructor(@Inject(HANGWISE_DATA) private readonly data: HangwiseData) {}

  @Get("audit-logs")
  async audit(@CurrentActor() actor: Actor, @Query() query: LimitQuery) {
    if (actor.role !== "admin") throw new DomainError("FORBIDDEN", "Admin role is required.", 403);
    const items = await this.data.listAudit(query.limit ?? 50);
    return {
      demo: true,
      items: items.map((item) => ({
        id: item.id,
        actorUserId: item.actorUserId,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        metadata: item.metadata,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }
}

@Module({ controllers: [AdminController] })
export class AdminModule {}
