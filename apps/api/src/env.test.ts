import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REQUIRED = {
  SKIP_ENV_VALIDATION: "",
  CLERK_SECRET_KEY: "sk_test_x",
  CLERK_PUBLISHABLE_KEY: "pk_test_x",
  CLERK_WEBHOOK_SIGNING_SECRET: "whsec_x",
  DATABASE_URL: "postgresql://postgres:password@localhost:5432/temba",
  WEB_ORIGIN: "http://localhost:3000",
  AWS_ENDPOINT_URL: "https://t3.storageapi.dev",
  AWS_ACCESS_KEY_ID: "key",
  AWS_SECRET_ACCESS_KEY: "secret",
  AWS_S3_BUCKET_NAME: "bucket",
  AWS_DEFAULT_REGION: "auto",
};

async function loadEnv(overrides: Record<string, string>) {
  for (const [key, value] of Object.entries({ ...REQUIRED, ...overrides })) {
    vi.stubEnv(key, value);
  }
  vi.resetModules();
  return import("./env");
}

describe("env", () => {
  beforeEach(() =>
    vi.spyOn(console, "error").mockImplementation(() => undefined),
  );
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("leaves the email channel off by default", async () => {
    const { env } = await loadEnv({ EMAIL_PROVIDER: "" });
    expect(env.EMAIL_PROVIDER).toBe("none");
  });

  it("refuses to boot with resend and no key or sender address", async () => {
    await expect(
      loadEnv({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "", EMAIL_FROM: "" }),
    ).rejects.toThrow(
      "EMAIL_PROVIDER=resend requires RESEND_API_KEY, EMAIL_FROM",
    );
    await expect(
      loadEnv({
        EMAIL_PROVIDER: "resend",
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: "",
      }),
    ).rejects.toThrow("EMAIL_PROVIDER=resend requires EMAIL_FROM");
  });

  it("boots with resend once both are set", async () => {
    const { env } = await loadEnv({
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "Temba <notifications@temba.example>",
    });
    expect(env.EMAIL_FROM).toBe("Temba <notifications@temba.example>");
  });

  it("parses flags and numbers when validation is skipped", async () => {
    const { env } = await loadEnv({
      SKIP_ENV_VALIDATION: "1",
      ACCEPT_SESSION_COOKIE: "false",
      WORKER_ENABLED: "false",
      API_ENABLED: "",
      PORT: "4100",
      WORKER_CONCURRENCY: "",
    });
    expect(env.ACCEPT_SESSION_COOKIE).toBe(false);
    expect(env.WORKER_ENABLED).toBe(false);
    expect(env.API_ENABLED).toBe(true);
    expect(env.PORT).toBe(4100);
    expect(env.WORKER_CONCURRENCY).toBe(5);
    expect(env.TRUST_PROXY_HOPS).toBe(1);
  });

  it("falls back to the defaults for values it cannot parse when validation is skipped", async () => {
    const { env } = await loadEnv({
      SKIP_ENV_VALIDATION: "1",
      ACCEPT_SESSION_COOKIE: "yes",
      PORT: "not-a-port",
    });
    expect(env.ACCEPT_SESSION_COOKIE).toBe(false);
    expect(env.PORT).toBe(4000);
  });

  it("treats an unset NODE_ENV as production and refuses an unknown one", async () => {
    const { env } = await loadEnv({ NODE_ENV: "" });
    expect(env.NODE_ENV).toBe("production");
    await expect(loadEnv({ NODE_ENV: "staging" })).rejects.toThrow();
  });
});
