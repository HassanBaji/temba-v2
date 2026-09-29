import { type Metadata } from "next";

import { OnboardingQuestionnaire } from "~/components/onboarding/onboarding-questionnaire";
import { onboardingRedirectTarget } from "~/lib/onboarding-step";

export const metadata: Metadata = {
  title: "Set up your account",
};

/**
 * The Onboarding questionnaire runs here — outside `/dashboard` and outside
 * `DashboardShell`, so there is no tab bar while a new User answers the two
 * questions. `middleware.ts` protects the route, so a signed-out visitor is
 * sent to login before this renders.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;

  return (
    <OnboardingQuestionnaire
      redirectTo={onboardingRedirectTarget(params.redirect_url)}
    />
  );
}
