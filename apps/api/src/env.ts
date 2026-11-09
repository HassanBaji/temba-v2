import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

function booleanFlag(defaultValue: boolean) {
  return z
    .enum(["true", "false"])
    .default(defaultValue ? "true" : "false")
    .transform((value) => value === "true");
}

/**
 * Values the host reads as booleans, numbers or modes. createEnv runs no
 * transforms under SKIP_ENV_VALIDATION, so these are parsed again on their own
 * and fall back to their defaults: "false" would otherwise be a truthy string.
 */
const typedServer = {
  NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
  PORT: z.coerce.number().int().positive().default(4000),
  ACCEPT_SESSION_COOKIE: booleanFlag(false),
  WORKER_ENABLED: booleanFlag(true),
  API_ENABLED: booleanFlag(true),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
  PAYMENT_PROVIDER: z.enum(["manual", "tap"]).default("manual"),
  EMAIL_PROVIDER: z.enum(["none", "resend"]).default("none"),
};

function parseTyped(runtimeEnv: NodeJS.ProcessEnv) {
  const entries = Object.entries(typedServer).map(([key, schema]) => {
    const raw = runtimeEnv[key] === "" ? undefined : runtimeEnv[key];
    const parsed = schema.safeParse(raw);
    return [key, parsed.success ? parsed.data : schema.parse(undefined)];
  });
  return Object.fromEntries(entries) as {
    [K in keyof typeof typedServer]: z.output<(typeof typedServer)[K]>;
  };
}

const skipValidation = !!process.env.SKIP_ENV_VALIDATION;

const validatedEnv = createEnv({
  server: {
    ...typedServer,
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1),
    DATABASE_URL: z.string().url(),
    WEB_ORIGIN: z.string().url(),
    AUTHORIZED_PARTIES: z.string().optional(),
    CONSOLE_ORIGIN: z.string().url().optional(),
    CLERK_JWT_KEY: z.string().min(1).optional(),
    AWS_ENDPOINT_URL: z.string().url(),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_S3_BUCKET_NAME: z.string().min(1),
    AWS_DEFAULT_REGION: z.string().min(1),
    TAP_SECRET_KEY: z.string().min(1).optional(),
    TAP_PUBLIC_KEY: z.string().min(1).optional(),
    TAP_PAYMENT_METHODS: z
      .string()
      .regex(
        /^\s*(card|benefit|benefitpay|apple_pay)(\s*,\s*(card|benefit|benefitpay|apple_pay))*\s*$/,
        "List card, benefit, benefitpay or apple_pay, comma separated",
      )
      .optional(),
    PAYMENT_RETURN_URL: z.string().min(1).default("temba://book/bookings"),
    API_PUBLIC_URL: z.string().url().optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  skipValidation,
  emptyStringAsUndefined: true,
});

const parsedEnv = skipValidation
  ? { ...validatedEnv, ...parseTyped(process.env) }
  : validatedEnv;

const TAP_REQUIRED = [
  "TAP_SECRET_KEY",
  "TAP_PUBLIC_KEY",
  "API_PUBLIC_URL",
] as const;

if (parsedEnv.PAYMENT_PROVIDER === "tap" && !skipValidation) {
  const missing = TAP_REQUIRED.filter((key) => !parsedEnv[key]);
  if (missing.length > 0) {
    throw new Error(
      `PAYMENT_PROVIDER=tap requires ${missing.join(", ")} to be set`,
    );
  }
}

const RESEND_REQUIRED = ["RESEND_API_KEY", "EMAIL_FROM"] as const;

if (parsedEnv.EMAIL_PROVIDER === "resend" && !skipValidation) {
  const missing = RESEND_REQUIRED.filter((key) => !parsedEnv[key]);
  if (missing.length > 0) {
    throw new Error(
      `EMAIL_PROVIDER=resend requires ${missing.join(", ")} to be set`,
    );
  }
}

export const env = parsedEnv;
