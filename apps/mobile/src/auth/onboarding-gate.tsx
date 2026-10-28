import { api } from "../trpc/react";
import { OnboardingQuestionnaire } from "./onboarding-questionnaire";
import { canReachTabs, onboardingPhaseFromState } from "./onboarding-step";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const state = api.users.onboardingState.useQuery();

  if (!canReachTabs(onboardingPhaseFromState(state.data))) {
    return <OnboardingQuestionnaire />;
  }
  return children;
}
