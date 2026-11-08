import "reflect-metadata";
import { writeFile } from "fs/promises";
import path from "path";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "../app.module";
import { applyHttpDefaults, mountOpenApi } from "../configure-app";

async function main(): Promise<void> {
  process.env.NODE_ENV ??= "development";
  process.env.DEMO_MODE ??= "true";
  process.env.AUTH_MODE ??= "development";
  process.env.DEV_AUTH_SECRET ??= "hangwise-dev-secret";
  process.env.DATABASE_URL ??= "postgresql://hangwise:hangwise@127.0.0.1:5432/hangwise";
  process.env.PAYMENTS_MODE ??= "disabled";
  process.env.VERIFICATION_MODE ??= "unavailable";
  process.env.HANGWISE_REPOSITORY = "memory";

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: false }), {
    logger: ["error", "warn", "log"],
  });
  applyHttpDefaults(app);
  const document = mountOpenApi(app);
  const target = path.resolve(__dirname, "../../../../docs/openapi.json");
  await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  process.stdout.write(`Wrote ${target}\n`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
