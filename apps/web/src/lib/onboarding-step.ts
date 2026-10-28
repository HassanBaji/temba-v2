import { safeInternalRedirect } from "@repo/domain/safe-internal-redirect";

/** Where the Onboarding questionnaire sends a User with no usable `redirect_url`. */
export const ONBOARDING_FALLBACK_REDIRECT = "/dashboard";

/** The shape `users.onboardingState` returns, read structurally. */
export type OnboardingQuestionnaireState = {
  provisioning: boolean;
  onboardingCompletedAt: Date | null;
};

export type OnboardingPhase =
  /** `users.onboardingState` has not answered yet. */
  | "loading"
  /** No `user` row yet — the Clerk `user.created` webhook has not landed. */
  | "provisioning"
  /** The questions, walked in the page from `@repo/domain/onboarding-flow`. */
  | "questions"
  /** Already complete: this User is sent onward and never questioned again. */
  | "complete";

/**
 * Whether a caller is questioned at all. Answers are held in the page and
 * saved in one `users.completeOnboarding` call, so there is no half-done
 * step to resume. A User whose questionnaire is already complete — including
 * one backfilled by the migration — is `complete` and redirected out, so the
 * questionnaire cannot be re-run.
 */
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
 * Where the questionnaire sends a User when it is done with them. The
 * `redirect_url` carried from the dashboard gate goes through the shipped
 * `safeInternalRedirect`, so onboarding is not an open-redirect door.
 */
export function onboardingRedirectTarget(value: string | null | undefined) {
  return safeInternalRedirect(value) ?? ONBOARDING_FALLBACK_REDIRECT;
}

/**
 * Whether a screen change should move focus to the new screen's heading. The
 * first answer from `users.onboardingState` is a page load, not a change, so
 * focus stays where the browser put it.
 */
export function shouldFocusStepHeading(previous: string, next: string) {
  return previous !== next && previous !== "loading";
}
