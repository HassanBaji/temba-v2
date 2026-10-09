export type OnboardingQuestionnaireState = {
  provisioning: boolean;
  preferredPosition: string | null;
  onboardingCompletedAt: Date | null;
  hasRating: boolean;
};

export type OnboardingStep =
  | "loading"
  | "provisioning"
  | "position"
  | "level"
  | "finishing"
  | "complete";

export const PROVISIONING_POLL_MS = 2000;
export const PROVISIONING_TIMEOUT_MS = 10 * PROVISIONING_POLL_MS;

export function onboardingStepFromState(
  state: OnboardingQuestionnaireState | undefined,
): OnboardingStep {
  if (!state) {
    return "loading";
  }
  if (state.provisioning) {
    return "provisioning";
  }
  if (state.onboardingCompletedAt) {
    return "complete";
  }
  if (!state.preferredPosition) {
    return "position";
  }
  if (!state.hasRating) {
    return "level";
  }
  return "finishing";
}

export function canReachTabs(step: OnboardingStep): boolean {
  return step === "complete";
}
