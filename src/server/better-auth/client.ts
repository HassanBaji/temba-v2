import { createAuthClient } from "better-auth/react";

function getBaseURL() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export type Session = typeof authClient.$Infer.Session;
