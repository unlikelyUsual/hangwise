import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.string().regex(/^\d+$/).optional(),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\/\S+$/),
  AUTH_MODE: z.enum(["development", "disabled"]).default("disabled"),
  DEV_AUTH_SECRET: z.string().optional(),
  CORS_ORIGINS: z.string().optional().default(""),
  DEMO_MODE: z.literal("true"),
  PAYMENTS_MODE: z.literal("disabled").default("disabled"),
  VERIFICATION_MODE: z.literal("unavailable").default("unavailable"),
  HANGWISE_REPOSITORY: z.enum(["prisma", "memory"]).default("prisma"),
  PLATFORM_FEE_BPS: z.string().optional(),
  RATE_LIMIT_MAX: z.string().regex(/^\d+$/).optional(),
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).optional(),
});

export type Env = {
  nodeEnv: "development" | "test";
  host: string;
  port: number;
  databaseUrl: string;
  authMode: "development" | "disabled";
  devAuthSecret: string | null;
  corsOrigins: string[];
  demoMode: true;
  paymentsMode: "disabled";
  verificationMode: "unavailable";
  repository: "prisma" | "memory";
  platformFeeBps: number | null;
  rateLimitMax: number;
  rateLimitWindowMs: number;
};

export const ENV = Symbol("ENV");

function blankToUndefined(value: string | undefined): string | undefined {
  if (value == null || value.trim() === "") return undefined;
  return value.trim();
}

function integerFrom(value: string | undefined, fallback: number, name: string, min: number, max: number): number {
  if (value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  }
  return parsed;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (source.NODE_ENV === "production") {
    throw new Error(
      "Hangwise skeleton refuses NODE_ENV=production. Auth, payments, verification, and store approval are not implemented.",
    );
  }
  const parsed = EnvSchema.safeParse({
    NODE_ENV: blankToUndefined(source.NODE_ENV),
    HOST: blankToUndefined(source.HOST),
    PORT: blankToUndefined(source.PORT),
    DATABASE_URL: blankToUndefined(source.DATABASE_URL),
    AUTH_MODE: blankToUndefined(source.AUTH_MODE),
    DEV_AUTH_SECRET: blankToUndefined(source.DEV_AUTH_SECRET),
    CORS_ORIGINS: source.CORS_ORIGINS,
    DEMO_MODE: blankToUndefined(source.DEMO_MODE),
    PAYMENTS_MODE: blankToUndefined(source.PAYMENTS_MODE),
    VERIFICATION_MODE: blankToUndefined(source.VERIFICATION_MODE),
    HANGWISE_REPOSITORY: blankToUndefined(source.HANGWISE_REPOSITORY),
    PLATFORM_FEE_BPS: blankToUndefined(source.PLATFORM_FEE_BPS),
    RATE_LIMIT_MAX: blankToUndefined(source.RATE_LIMIT_MAX),
    RATE_LIMIT_WINDOW_MS: blankToUndefined(source.RATE_LIMIT_WINDOW_MS),
  });
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }
  const value = parsed.data;
  if (value.AUTH_MODE === "development" && (value.DEV_AUTH_SECRET?.length ?? 0) < 16) {
    throw new Error("DEV_AUTH_SECRET must be at least 16 characters when AUTH_MODE=development.");
  }
  let platformFeeBps: number | null = null;
  if (value.PLATFORM_FEE_BPS != null) {
    if (!/^\d+$/.test(value.PLATFORM_FEE_BPS) || Number(value.PLATFORM_FEE_BPS) > 10_000) {
      throw new Error("PLATFORM_FEE_BPS must be an integer from 0 to 10000, or unset. There is no default take rate.");
    }
    platformFeeBps = Number(value.PLATFORM_FEE_BPS);
  }
  return {
    nodeEnv: value.NODE_ENV,
    host: value.HOST,
    port: integerFrom(value.PORT, 3000, "PORT", 0, 65_535),
    databaseUrl: value.DATABASE_URL,
    authMode: value.AUTH_MODE,
    devAuthSecret: value.AUTH_MODE === "development" ? (value.DEV_AUTH_SECRET ?? null) : null,
    corsOrigins: value.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter((origin) => origin.length > 0),
    demoMode: true,
    paymentsMode: "disabled",
    verificationMode: "unavailable",
    repository: value.HANGWISE_REPOSITORY,
    platformFeeBps,
    rateLimitMax: integerFrom(value.RATE_LIMIT_MAX, 120, "RATE_LIMIT_MAX", 1, 10_000),
    rateLimitWindowMs: integerFrom(value.RATE_LIMIT_WINDOW_MS, 60_000, "RATE_LIMIT_WINDOW_MS", 1000, 3_600_000),
  };
}
