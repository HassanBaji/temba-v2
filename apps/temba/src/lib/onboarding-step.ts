import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

/** Where the Onboarding questionnaire sends a User with no usable `redirect_url`. */
export const ONBOARDING_FALLBACK_REDIRECT = "/dashboard";

/** The shape `users.onboardingState` returns, read structurally. */
export type OnboardingQuestionnaireState = {
  provisioning: boolean;
  preferredPosition: string | null;
  onboardingCompletedAt: Date | null;
  hasRating: boolean;
};

export type OnboardingStep =
  /** `users.onboardingState` has not answered yet. */
  | "loading"
  /** No `user` row yet — the Clerk `user.created` webhook has not landed. */
  | "provisioning"
  /** Step one: Preferred Position. */
  | "position"
  /** Step two: the one-time Level declaration. */
  | "level"
  /** Both answered, `onboardingCompletedAt` still null — complete it. */
  | "finishing"
  /** Already complete: this User is sent onward and never questioned again. */
  | "complete";

/**
 * Which step of the Onboarding questionnaire a caller resumes on.
 *
 * Preferred Position unanswered → step one; answered but no padel Rating →
 * step two; both answered → finish. A User whose questionnaire is already
 * complete — including one backfilled by the migration, complete with a null
 * Preferred Position — is `complete` and is redirected out, so the
 * questionnaire cannot be re-run.
 */
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

/**
 * Where the questionnaire sends a User when it is done with them. The
 * `redirect_url` carried from the dashboard gate goes through the shipped
 * `safeInternalRedirect`, so onboarding is not an open-redirect door.
 */
export function onboardingRedirectTarget(value: string | null | undefined) {
  return safeInternalRedirect(value) ?? ONBOARDING_FALLBACK_REDIRECT;
}
