import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { applyHttpDefaults, mountOpenApi } from "./configure-app";
import { ENV, type Env } from "./config/env";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: false }), {
    logger: ["error", "warn", "log"],
  });
  applyHttpDefaults(app);
  mountOpenApi(app);
  const env = app.get<Env>(ENV);
  await app.listen({ port: env.port, host: env.host });
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "API failed to start";
  if (message.includes("postgres://") || message.includes("postgresql://")) {
    console.error("API failed while reading the database configuration.");
  } else {
    console.error(message);
  }
  process.exit(1);
});
