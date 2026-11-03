import { type Metadata } from "next";

import { ProfileChecklistScreen } from "~/components/onboarding/profile-checklist-screen";
import { onboardingRedirectTarget } from "~/lib/onboarding-step";
import { getRequestMessages } from "~/lib/request-locale";
import { safeInternalRedirect } from "@repo/domain/safe-internal-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.webAuth.onboarding.checklist.title };
}

/**
 * The Profile checklist runs here — outside `/dashboard` and outside
 * `DashboardShell`, so there is no tab bar on the "You're in" screen after
 * sign-up (`?fresh=1`). `middleware.ts` protects the route, so a signed-out
 * visitor is sent to login before this renders.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string; fresh?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = safeInternalRedirect(params.redirect_url);

  return (
    <ProfileChecklistScreen
      fresh={params.fresh === "1"}
      redirectUrl={redirectUrl}
      redirectTo={onboardingRedirectTarget(redirectUrl)}
    />
  );
}
