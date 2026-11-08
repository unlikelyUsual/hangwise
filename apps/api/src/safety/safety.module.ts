import { Body, Controller, Get, HttpCode, Inject, Module, Post, Query } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";
import { Public } from "../auth/public.decorator";
import { CurrentActor } from "../auth/current-actor.decorator";
import { requireVisibleBooking } from "../bookings/access";
import { HANGWISE_DATA, type HangwiseData } from "../data/hangwise-data";
import { DomainError } from "../domain/errors";
import { publicDatePolicy } from "../domain/policy";
import { presentCheckIn } from "../domain/present";
import type { Actor, ReportCategory } from "../domain/types";

class CreateReportDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  subjectUserId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiProperty({ enum: ["policy", "safety", "other"] })
  @IsIn(["policy", "safety", "other"])
  category!: ReportCategory;

  @ApiProperty()
  @IsString()
  @Length(10, 2000)
  body!: string;
}

class CreateBlockDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  blockedUserId!: string;
}

class CreateCheckInDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  bookingId!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 500)
  note!: string;
}

class BookingQuery {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  bookingId!: string;
}

@ApiTags("safety")
@Controller("v1/safety")
export class SafetyController {
  constructor(@Inject(HANGWISE_DATA) private readonly data: HangwiseData) {}

  @Public()
  @Get("policy")
  policy() {
    return publicDatePolicy;
  }

  @ApiSecurity("devUser")
  @ApiSecurity("devSecret")
  @Post("reports")
  @HttpCode(201)
  async report(@CurrentActor() actor: Actor, @Body() body: CreateReportDto) {
    if (body.subjectUserId) {
      const subject = await this.data.getUser(body.subjectUserId);
      if (!subject) throw new DomainError("NOT_FOUND", "Subject user not found.", 404);
    }
    if (body.bookingId) await requireVisibleBooking(this.data, actor, body.bookingId);
    const report = await this.data.createReport({
      reporterUserId: actor.userId,
      subjectUserId: body.subjectUserId ?? null,
      bookingId: body.bookingId ?? null,
      category: body.category,
      body: body.body.trim(),
    });
    return {
      id: report.id,
      status: report.status,
      category: report.category,
      demo: true,
      monitored: false,
      reviewSla: "none",
    };
  }

  @ApiSecurity("devUser")
  @ApiSecurity("devSecret")
  @Post("blocks")
  async block(@CurrentActor() actor: Actor, @Body() body: CreateBlockDto) {
    const subject = await this.data.getUser(body.blockedUserId);
    if (!subject) throw new DomainError("NOT_FOUND", "User not found.", 404);
    const result = await this.data.createBlock(actor.userId, body.blockedUserId);
    return { blockedUserId: body.blockedUserId, alreadyBlocked: result.alreadyBlocked, demo: true };
  }

  @ApiSecurity("devUser")
  @ApiSecurity("devSecret")
  @Post("check-ins")
  @HttpCode(201)
  async checkIn(@CurrentActor() actor: Actor, @Body() body: CreateCheckInDto) {
    await requireVisibleBooking(this.data, actor, body.bookingId);
    const row = await this.data.createCheckIn({ bookingId: body.bookingId, userId: actor.userId, note: body.note.trim() });
    return presentCheckIn(row);
  }

  @ApiSecurity("devUser")
  @ApiSecurity("devSecret")
  @Get("check-ins")
  async listCheckIns(@CurrentActor() actor: Actor, @Query() query: BookingQuery) {
    await requireVisibleBooking(this.data, actor, query.bookingId);
    const rows = await this.data.listCheckIns(query.bookingId);
    return rows.map(presentCheckIn);
  }
}

@Module({ controllers: [SafetyController] })
export class SafetyModule {}
