import { INestApplication, ValidationPipe } from "@nestjs/common";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { SwaggerModule } from "@nestjs/swagger";
import { randomUUID } from "crypto";
import { ENV, type Env } from "./config/env";
import { buildOpenApiConfig } from "./openapi";

export function applyHttpDefaults(app: NestFastifyApplication): void {
  const env = app.get<Env>(ENV);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: env.corsOrigins.length === 0 ? false : env.corsOrigins,
    credentials: false,
    allowedHeaders: ["Content-Type", "X-Hangwise-Dev-User", "X-Hangwise-Dev-Secret", "Idempotency-Key", "X-Request-Id"],
  });
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook("onRequest", (request, reply, done) => {
    const incoming = request.headers["x-request-id"];
    const requestId = typeof incoming === "string" && incoming.length > 0 && incoming.length <= 80 ? incoming : randomUUID();
    request.headers["x-request-id"] = requestId;
    reply.header("x-request-id", requestId);
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
    reply.header("x-hangwise-demo", "true");
    done();
  });
}

export function mountOpenApi(app: INestApplication) {
  const document = SwaggerModule.createDocument(app, buildOpenApiConfig());
  SwaggerModule.setup("docs", app, document, { jsonDocumentUrl: "/openapi.json" });
  return document;
}
