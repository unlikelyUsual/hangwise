import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Env } from "../config/env";
import type { HangwiseData } from "../data/hangwise-data";
import { DEV_SECRET_HEADER, DEV_USER_HEADER, DemoUserIds } from "../demo/personas";
import { DevAuthGuard } from "./dev-auth.guard";

const env: Env = {
  nodeEnv: "test",
  host: "127.0.0.1",
  port: 0,
  databaseUrl: "postgresql://hangwise:hangwise@127.0.0.1:5433/hangwise",
  authMode: "development",
  devAuthSecret: "hangwise-dev-secret",
  corsOrigins: [],
  demoMode: true,
  paymentsMode: "disabled",
  verificationMode: "unavailable",
  repository: "memory",
  platformFeeBps: null,
  rateLimitMax: 10,
  rateLimitWindowMs: 60_000,
};

const data = {
  async getUser(id: string) {
    if (id !== DemoUserIds.alex) return null;
    return {
      id,
      email: "alex.demo@demo.hangwise.invalid",
      displayName: "Alex Demo",
      role: "customer" as const,
      isDemo: true,
      deletedAt: null,
    };
  },
} as HangwiseData;

function context(headers: Record<string, string>, isPublic = false): { context: ExecutionContext; request: { actor?: unknown; headers: Record<string, string> } } {
  const request = { headers, actor: undefined as unknown };
  const reflector = { getAllAndOverride: () => isPublic } as unknown as Reflector;
  return {
    request,
    context: {
      getHandler: () => reflector,
      getClass: () => reflector,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext,
  };
}

describe("DevAuthGuard", () => {
  const guard = new DevAuthGuard({ getAllAndOverride: () => false } as unknown as Reflector, env, data);

  it("rejects a missing or wrong development secret", async () => {
    const missing = context({});
    await expect(guard.canActivate(missing.context)).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
    const wrong = context({ [DEV_USER_HEADER]: DemoUserIds.alex, [DEV_SECRET_HEADER]: "not-the-dev-secret" });
    await expect(guard.canActivate(wrong.context)).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("attaches the database role rather than a role from the header", async () => {
    const call = context({ [DEV_USER_HEADER]: DemoUserIds.alex, [DEV_SECRET_HEADER]: "hangwise-dev-secret" });
    const allowed = new DevAuthGuard({ getAllAndOverride: () => false } as unknown as Reflector, env, data);
    await expect(allowed.canActivate(call.context)).resolves.toBe(true);
    expect(call.request.actor).toMatchObject({ userId: DemoUserIds.alex, role: "customer", isDemo: true });
  });

  it("fails closed when development auth is disabled", async () => {
    const closed = new DevAuthGuard({ getAllAndOverride: () => false } as unknown as Reflector, { ...env, authMode: "disabled", devAuthSecret: null }, data);
    const call = context({ [DEV_USER_HEADER]: DemoUserIds.alex, [DEV_SECRET_HEADER]: "hangwise-dev-secret" });
    await expect(closed.canActivate(call.context)).rejects.toMatchObject({ code: "AUTH_UNAVAILABLE" });
  });

  it("allows public routes without headers", async () => {
    const open = new DevAuthGuard({ getAllAndOverride: () => true } as unknown as Reflector, { ...env, authMode: "disabled", devAuthSecret: null }, data);
    await expect(open.canActivate(context({}, true).context)).resolves.toBe(true);
  });
});
