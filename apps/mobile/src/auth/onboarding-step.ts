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

/**
 * Only the webhook race holds a User at the door. The questionnaire is a
 * Profile task now, so unanswered questions never block the tabs (ADR-0049).
 */
export function canReachTabs(phase: OnboardingPhase): boolean {
  return phase === "questions" || phase === "complete";
}
