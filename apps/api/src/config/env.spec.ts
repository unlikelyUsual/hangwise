import { loadEnv } from "./env";

const base = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://hangwise:hangwise@127.0.0.1:5432/hangwise",
  DEMO_MODE: "true",
  AUTH_MODE: "development",
  DEV_AUTH_SECRET: "hangwise-dev-secret",
};

describe("loadEnv", () => {
  it("refuses production boot", () => {
    expect(() => loadEnv({ ...base, NODE_ENV: "production" })).toThrow(/refuses NODE_ENV=production/);
  });

  it("requires demo mode and a development secret", () => {
    expect(() => loadEnv({ ...base, DEMO_MODE: "false" })).toThrow(/DEMO_MODE/);
    expect(() => loadEnv({ ...base, DEV_AUTH_SECRET: "short" })).toThrow(/DEV_AUTH_SECRET/);
  });

  it("rejects any payments mode other than disabled", () => {
    expect(() => loadEnv({ ...base, PAYMENTS_MODE: "live" })).toThrow(/PAYMENTS_MODE/);
  });

  it("leaves the platform fee unknown unless basis points are set", () => {
    expect(loadEnv(base).platformFeeBps).toBeNull();
    expect(loadEnv({ ...base, PLATFORM_FEE_BPS: "1500" }).platformFeeBps).toBe(1500);
    expect(() => loadEnv({ ...base, PLATFORM_FEE_BPS: "15000" })).toThrow(/no default take rate/);
  });

  it("fails closed when development auth is not selected", () => {
    const env = loadEnv({ ...base, AUTH_MODE: "disabled", DEV_AUTH_SECRET: undefined });
    expect(env.authMode).toBe("disabled");
    expect(env.devAuthSecret).toBeNull();
  });
});
