import { type Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  dashboardOnboardingRedirect,
  PATHNAME_HEADER,
} from "~/lib/dashboard-onboarding-gate";
import { RequestAnswersProvider } from "~/components/requests/request-answers-provider";
import { StoredLocaleSync } from "~/components/stored-locale-sync";
import { loadCallerOnboardingState } from "~/lib/caller-onboarding-state";
import { getRequestMessages } from "~/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.common.home };
}

/**
 * The provisioning gate: a User whose `user` row has not landed yet waits on
 * `/onboarding` instead of meeting `UNAUTHORIZED` here. It lives here rather
 * than in `middleware.ts` because `clerkMiddleware` runs on the edge runtime,
 * where the Drizzle Postgres client is unavailable. The Onboarding
 * questionnaire is an optional Profile task and no longer gates anything
 * (ADR-0049).
 *
 * Invite routes (`/g/{code}`, `/gr/{code}`, `/invites/**`) sit outside
 * `/dashboard` and stay ungated. The accept's `/dashboard/...` landing hits
 * this gate afterwards and is carried through as `redirect_url`.
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
    <div className="bg-background text-foreground min-h-screen">
      <StoredLocaleSync />
      <RequestAnswersProvider>{children}</RequestAnswersProvider>
    </div>
  );
}
