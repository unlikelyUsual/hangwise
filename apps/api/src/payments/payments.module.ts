import { Body, Controller, Get, Inject, Module, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { CurrentActor } from "../auth/current-actor.decorator";
import { HANGWISE_DATA, type HangwiseData } from "../data/hangwise-data";
import { DomainError } from "../domain/errors";
import type { Actor } from "../domain/types";
import { requireVisibleBooking } from "../bookings/access";
import { UnavailablePaymentProvider } from "../providers/providers";

class CheckoutDto {}

@ApiTags("payments")
@ApiSecurity("devUser")
@ApiSecurity("devSecret")
@Controller("v1/payments")
export class PaymentsController {
  constructor(
    private readonly payments: UnavailablePaymentProvider,
    @Inject(HANGWISE_DATA) private readonly data: HangwiseData,
  ) {}

  @Post("checkout")
  async checkout(@Body() _body: CheckoutDto): Promise<never> {
    return this.payments.createCharge();
  }

  @Get("booking/:bookingId")
  async forBooking(@CurrentActor() actor: Actor, @Param("bookingId", ParseUUIDPipe) bookingId: string) {
    await requireVisibleBooking(this.data, actor, bookingId);
    const payment = await this.data.getPaymentForBooking(bookingId);
    if (!payment) throw new DomainError("NOT_FOUND", "No payment record exists for that booking.", 404);
    return {
      demo: true,
      id: payment.id,
      bookingId: payment.bookingId,
      status: payment.status,
      provider: payment.provider,
      amountMinor: payment.amountMinor,
      currency: payment.currency.trim(),
      externalReference: payment.externalReference,
      charged: payment.status === "captured",
    };
  }
}

@Module({ controllers: [PaymentsController] })
export class PaymentsModule {}
