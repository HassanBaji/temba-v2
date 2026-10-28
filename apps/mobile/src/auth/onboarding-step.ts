export type OnboardingQuestionnaireState = {
  provisioning: boolean;
  onboardingCompletedAt: Date | null;
};

export type OnboardingPhase =
  | "loading"
  | "provisioning"
  | "questions"
  | "complete";

export const PROVISIONING_POLL_MS = 2000;
export const PROVISIONING_TIMEOUT_MS = 10 * PROVISIONING_POLL_MS;

export function onboardingPhaseFromState(
  state: OnboardingQuestionnaireState | undefined,
): OnboardingPhase {
  if (!state) {
    return "loading";
  }
  if (state.provisioning) {
    return "provisioning";
  }
  return state.onboardingCompletedAt ? "complete" : "questions";
}

export function canReachTabs(phase: OnboardingPhase): boolean {
  return phase === "complete";
}
