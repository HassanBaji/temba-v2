import type { ProfileTaskId } from "@repo/domain/profile-checklist";
import { safeInternalRedirect } from "@repo/domain/safe-internal-redirect";

import { ONBOARDING_PATH } from "~/lib/dashboard-onboarding-gate";

/** Where the Profile checklist sends a User with no usable `redirect_url`. */
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
  /** The row exists: the checklist and every Profile task can render. */
  | "ready";

/**
 * Whether the Profile checklist and its tasks can render for the caller.
 * Only the webhook race holds them back; a finished questionnaire never does,
 * since the sports task can be revisited (ADR-0049).
 */
export function onboardingPhaseFromState(
  state: Pick<OnboardingQuestionnaireState, "provisioning"> | undefined,
): OnboardingPhase {
  if (!state) {
    return "loading";
  }
  return state.provisioning ? "provisioning" : "ready";
}

/**
 * Where the checklist sends a User when it is done with them. The
 * `redirect_url` carried from sign-up or Home goes through the shipped
 * `safeInternalRedirect`, so onboarding is not an open-redirect door.
 */
export function onboardingRedirectTarget(value: string | null | undefined) {
  return safeInternalRedirect(value) ?? ONBOARDING_FALLBACK_REDIRECT;
}

function withRedirectUrl(path: string, redirectUrl: string | null) {
  if (!redirectUrl) {
    return path;
  }
  return `${path}?${new URLSearchParams({ redirect_url: redirectUrl }).toString()}`;
}

/** The checklist, keeping the `redirect_url` every task carries. */
export function profileChecklistHref(redirectUrl: string | null) {
  return withRedirectUrl(ONBOARDING_PATH, redirectUrl);
}

/** One Profile task's screen, keeping the `redirect_url`. */
export function profileTaskHref(
  task: ProfileTaskId,
  redirectUrl: string | null,
) {
  return withRedirectUrl(`${ONBOARDING_PATH}/${task}`, redirectUrl);
}

/**
 * Whether a screen change should move focus to the new screen's heading. The
 * first answer from `users.onboardingState` is a page load, not a change, so
 * focus stays where the browser put it.
 */
export function shouldFocusStepHeading(previous: string, next: string) {
  return previous !== next && previous !== "loading";
}
