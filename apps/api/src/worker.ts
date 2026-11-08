import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { BookingsService } from "./bookings/bookings.service";

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn", "log"] });
  try {
    const expired = await app.get(BookingsService).expireDueHolds(new Date());
    process.stdout.write(`${JSON.stringify({ worker: "expire-holds", expired, scheduled: false, demo: true })}\n`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Worker failed";
  if (message.includes("postgres://") || message.includes("postgresql://")) {
    console.error("Worker failed while connecting to the database.");
  } else {
    console.error(message);
  }
  process.exit(1);
});
