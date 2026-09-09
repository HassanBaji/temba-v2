import "~/styles/globals.css";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  dashboardOnboardingRedirect,
  PATHNAME_HEADER,
} from "~/lib/dashboard-onboarding-gate";
import { loadCallerOnboardingState } from "~/server/auth/caller-onboarding-state";
import { HydrateClient } from "~/trpc/server";

/**
 * The Onboarding questionnaire gate. It lives here rather than in
 * `middleware.ts` because `clerkMiddleware` runs on the edge runtime, where
 * the Drizzle Postgres client is unavailable — and mirroring completion into
 * Clerk session claims would put the source of truth in two places.
 *
 * Invite routes (`/g/{code}`, `/gr/{code}`, `/invites/**`) sit outside
 * `/dashboard` and stay ungated, so a 6-hour Invite token is never spent
 * behind the questionnaire. The accept's `/dashboard/...` landing hits this
 * gate afterwards and is carried through as `redirect_url`.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const target = dashboardOnboardingRedirect({
    pathname: requestHeaders.get(PATHNAME_HEADER),
    state: await loadCallerOnboardingState(),
    designPreviewExempt: process.env.NODE_ENV === "development",
  });

  if (target) {
    redirect(target);
  }

  return (
    <HydrateClient>
      <div className="text-foreground min-h-screen bg-white">{children}</div>
    </HydrateClient>
  );
}
