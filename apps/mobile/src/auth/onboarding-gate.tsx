import { api } from "../trpc/react";
import { OnboardingQuestionnaire } from "./onboarding-questionnaire";
import { canReachTabs, onboardingStepFromState } from "./onboarding-step";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const state = api.users.onboardingState.useQuery();

  if (!canReachTabs(onboardingStepFromState(state.data))) {
    return <OnboardingQuestionnaire />;
  }
  return children;
}
