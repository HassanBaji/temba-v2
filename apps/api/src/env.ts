import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    PORT: z.coerce.number().int().positive().default(4000),
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1),
    DATABASE_URL: z.string().url(),
    WEB_ORIGIN: z.string().url(),
    AUTHORIZED_PARTIES: z.string().optional(),
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
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
