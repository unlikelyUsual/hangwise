import { Body, Controller, Get, HttpCode, Inject, Module, Post, Query } from "@nestjs/common";
import { ApiProperty, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { IsInt, IsString, IsUUID, Length, Max, Min } from "class-validator";
import { CurrentActor } from "../auth/current-actor.decorator";
import { isParticipant } from "../bookings/access";
import { HANGWISE_DATA, type HangwiseData } from "../data/hangwise-data";
import { DomainError } from "../domain/errors";
import { presentReview } from "../domain/present";
import type { Actor } from "../domain/types";

class CreateReviewDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  bookingId!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty()
  @IsString()
  @Length(1, 500)
  body!: string;
}

class BookingQuery {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  bookingId!: string;
}

@ApiTags("reviews")
@ApiSecurity("devUser")
@ApiSecurity("devSecret")
@Controller("v1/reviews")
export class ReviewsController {
  constructor(@Inject(HANGWISE_DATA) private readonly data: HangwiseData) {}

  @Get()
  async list(@CurrentActor() actor: Actor, @Query() query: BookingQuery) {
    const booking = await this.data.getBooking(query.bookingId);
    if (!booking || !(await isParticipant(this.data, actor, booking))) {
      throw new DomainError("NOT_FOUND", "Booking not found.", 404);
    }
    const rows = await this.data.listReviewsForBooking(query.bookingId);
    return rows.map(presentReview);
  }

  @Post()
  @HttpCode(201)
  async create(@CurrentActor() actor: Actor, @Body() body: CreateReviewDto) {
    const booking = await this.data.getBooking(body.bookingId);
    if (!booking || !(await isParticipant(this.data, actor, booking))) {
      throw new DomainError("NOT_FOUND", "Booking not found.", 404);
    }
    if (booking.status !== "completed") {
      throw new DomainError(
        "INVALID_REVIEW",
        "Reviews are only stored after a completed booking. This does not verify that a meeting happened.",
        409,
      );
    }
    if (await this.data.findReview(booking.id, actor.userId)) {
      throw new DomainError("REVIEW_EXISTS", "You already reviewed this booking.", 409);
    }
    const review = await this.data.createReview({
      bookingId: booking.id,
      authorUserId: actor.userId,
      rating: body.rating,
      body: body.body.trim(),
    });
    return presentReview(review);
  }
}

@Module({ controllers: [ReviewsController] })
export class ReviewsModule {}
