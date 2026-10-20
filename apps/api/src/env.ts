import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

function booleanFlag(defaultValue: boolean) {
  return z
    .enum(["true", "false"])
    .default(defaultValue ? "true" : "false")
    .transform((value) => value === "true");
}

const parsedEnv = createEnv({
  server: {
    PORT: z.coerce.number().int().positive().default(4000),
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1),
    DATABASE_URL: z.string().url(),
    WEB_ORIGIN: z.string().url(),
    AUTHORIZED_PARTIES: z.string().optional(),
    CONSOLE_ORIGIN: z.string().url().optional(),
    ACCEPT_SESSION_COOKIE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    CLERK_JWT_KEY: z.string().min(1).optional(),
    AWS_ENDPOINT_URL: z.string().url(),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_S3_BUCKET_NAME: z.string().min(1),
    AWS_DEFAULT_REGION: z.string().min(1),
    WORKER_ENABLED: booleanFlag(true),
    API_ENABLED: booleanFlag(true),
    PAYMENT_PROVIDER: z.enum(["manual", "tap"]).default("manual"),
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
    WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

const TAP_REQUIRED = [
  "TAP_SECRET_KEY",
  "TAP_PUBLIC_KEY",
  "API_PUBLIC_URL",
] as const;

if (parsedEnv.PAYMENT_PROVIDER === "tap" && !process.env.SKIP_ENV_VALIDATION) {
  const missing = TAP_REQUIRED.filter((key) => !parsedEnv[key]);
  if (missing.length > 0) {
    throw new Error(
      `PAYMENT_PROVIDER=tap requires ${missing.join(", ")} to be set`,
    );
  }
}

export const env = parsedEnv;
