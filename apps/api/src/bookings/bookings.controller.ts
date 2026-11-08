import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiHeader, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { CurrentActor } from "../auth/current-actor.decorator";
import type { Actor } from "../domain/types";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto, HoldBookingDto } from "./dto";

@ApiTags("bookings")
@ApiSecurity("devUser")
@ApiSecurity("devSecret")
@ApiHeader({ name: "X-Hangwise-Dev-User", required: true })
@ApiHeader({ name: "X-Hangwise-Dev-Secret", required: true })
@Controller("v1/bookings")
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  list(@CurrentActor() actor: Actor) {
    return this.bookings.list(actor);
  }

  @Post()
  @HttpCode(201)
  @ApiHeader({ name: "Idempotency-Key", required: true })
  create(@CurrentActor() actor: Actor, @Body() body: CreateBookingDto, @Headers("idempotency-key") idempotencyKey?: string) {
    return this.bookings.create(actor, body, idempotencyKey);
  }

  @Get(":id")
  get(@CurrentActor() actor: Actor, @Param("id", ParseUUIDPipe) id: string) {
    return this.bookings.get(actor, id);
  }

  @Post(":id/accept")
  accept(@CurrentActor() actor: Actor, @Param("id", ParseUUIDPipe) id: string) {
    return this.bookings.accept(actor, id);
  }

  @Post(":id/decline")
  decline(@CurrentActor() actor: Actor, @Param("id", ParseUUIDPipe) id: string) {
    return this.bookings.decline(actor, id);
  }

  @Post(":id/hold")
  hold(@CurrentActor() actor: Actor, @Param("id", ParseUUIDPipe) id: string, @Body() body: HoldBookingDto) {
    return this.bookings.hold(actor, id, body.holdMinutes);
  }

  @Post(":id/cancel")
  cancel(@CurrentActor() actor: Actor, @Param("id", ParseUUIDPipe) id: string) {
    return this.bookings.cancel(actor, id);
  }

  @Post(":id/complete")
  complete(@CurrentActor() actor: Actor, @Param("id", ParseUUIDPipe) id: string) {
    return this.bookings.complete(actor, id);
  }
}
