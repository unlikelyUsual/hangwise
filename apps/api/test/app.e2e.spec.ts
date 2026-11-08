import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { applyHttpDefaults, mountOpenApi } from "../src/configure-app";
import { addDays, bangkokDate, DemoBookingIds, DemoProfileIds, slotOn } from "../src/demo/dataset";
import { DEV_SECRET_HEADER, DEV_USER_HEADER, DemoUserIds } from "../src/demo/personas";

describe("Hangwise API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { logger: false });
    applyHttpDefaults(app as NestFastifyApplication);
    await app.init();
    mountOpenApi(app);
    await (app as NestFastifyApplication).getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = (userId: string) => ({
    [DEV_USER_HEADER]: userId,
    [DEV_SECRET_HEADER]: "hangwise-dev-secret",
  });

  it("reports demo mode and disabled payments", async () => {
    const response = await request(app.getHttpServer()).get("/health").expect(200);
    expect(response.body).toMatchObject({
      status: "ok",
      service: "hangwise-api",
      demoMode: true,
      payments: "disabled",
      verification: "unavailable",
    });
    expect(response.headers["x-hangwise-demo"]).toBe("true");
  });

  it("lists fictional companions without authentication", async () => {
    const response = await request(app.getHttpServer()).get("/v1/companions").expect(200);
    expect(response.body).toHaveLength(4);
    expect(response.body.every((companion: { ageVerified: boolean; identityVerified: boolean }) => companion.ageVerified === false && companion.identityVerified === false)).toBe(true);
    expect(response.body.map((companion: { publicName: string }) => companion.publicName)).toContain("Maya Srisai");
  });

  it("rejects protected routes without development auth", async () => {
    const response = await request(app.getHttpServer()).get("/v1/bookings").expect(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("creates a booking, replays the idempotency key, and does not charge", async () => {
    const slot = slotOn(addDays(bangkokDate(new Date()), 6), 15, 2);
    const body = {
      companionProfileId: DemoProfileIds.maya,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      venueName: "Lumpini Park",
      venueArea: "Pathum Wan",
      note: "Public walk.",
      acknowledgedPublicDatePolicy: true,
    };
    const created = await request(app.getHttpServer())
      .post("/v1/bookings")
      .set(auth(DemoUserIds.alex))
      .set("Idempotency-Key", "e2e-booking-1")
      .send(body)
      .expect(201);
    expect(created.body.price.feePolicy).toBe("unknown");
    expect(created.body.paymentAuthorized).toBe(false);
    const replay = await request(app.getHttpServer())
      .post("/v1/bookings")
      .set(auth(DemoUserIds.alex))
      .set("Idempotency-Key", "e2e-booking-1")
      .send(body)
      .expect(201);
    expect(replay.body.id).toBe(created.body.id);
    await request(app.getHttpServer()).get(`/v1/bookings/${created.body.id}`).set(auth(DemoUserIds.priya)).expect(404);
    const payment = await request(app.getHttpServer()).get(`/v1/payments/booking/${created.body.id}`).set(auth(DemoUserIds.alex)).expect(200);
    expect(payment.body).toMatchObject({ status: "unavailable", charged: false, provider: "unconfigured" });
  });

  it("returns a conflict when accepting an overlapping request", async () => {
    const response = await request(app.getHttpServer())
      .post(`/v1/bookings/${DemoBookingIds.mayaOverlapRequest}/accept`)
      .set(auth(DemoUserIds.maya))
      .expect(409);
    expect(response.body.error.code).toBe("BOOKING_CONFLICT");
  });

  it("refuses checkout and card fields", async () => {
    const unavailable = await request(app.getHttpServer()).post("/v1/payments/checkout").set(auth(DemoUserIds.alex)).send({}).expect(501);
    expect(unavailable.body.error.code).toBe("PAYMENTS_UNAVAILABLE");
    const rejected = await request(app.getHttpServer())
      .post("/v1/payments/checkout")
      .set(auth(DemoUserIds.alex))
      .send({ cardNumber: "4242424242424242" })
      .expect(400);
    expect(JSON.stringify(rejected.body)).not.toContain("4242424242424242");
  });

  it("refuses identity verification without accepting documents", async () => {
    const status = await request(app.getHttpServer()).get("/v1/verification/me").set(auth(DemoUserIds.alex)).expect(200);
    expect(status.body).toMatchObject({ collectsGovernmentId: false, status: "unavailable" });
    const start = await request(app.getHttpServer()).post("/v1/verification/start").set(auth(DemoUserIds.alex)).send({}).expect(501);
    expect(start.body.error.code).toBe("VERIFICATION_UNAVAILABLE");
  });

  it("publishes OpenAPI for the booking and health routes", async () => {
    const response = await request(app.getHttpServer()).get("/openapi.json").expect(200);
    expect(response.body.paths["/health"]).toBeDefined();
    expect(response.body.paths["/v1/bookings"]).toBeDefined();
    expect(response.body.paths["/v1/payments/checkout"]).toBeDefined();
  });
});
