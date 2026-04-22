import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins";

import { env } from "~/env";
import { db } from "~/server/db";

function getBaseURL() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

const baseURL = getBaseURL();

export function skipStateMismatch(): BetterAuthPlugin {
  return {
    id: "skip-state-mismatch",
    init(ctx) {
      return {
        context: {
          ...ctx,
          oauthConfig: {
            skipStateCookieCheck: true,
            ...ctx?.oauthConfig,
          },
        },
      };
    },
  };
}

export const auth = betterAuth({
  baseURL,
  secret: env.BETTER_AUTH_SECRET ?? "dev-secret-change-in-production",
  plugins: [skipStateMismatch()],
  database: drizzleAdapter(db, {
    provider: "pg", // or "pg" or "mysql"
  }),

  advanced: {
    database: {
      generateId: false,
    },

    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
    },
    cookies: {
      state: {
        attributes: {
          sameSite: "none",
          secure: true,
          path: "/",
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_AUTH_CLIENT_ID,
      clientSecret: env.GOOGLE_AUTH_CLIENT_SECRET,
      redirectURI: `${baseURL}/api/auth/callback/google`,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
