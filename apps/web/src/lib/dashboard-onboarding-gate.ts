import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

/**
 * Request header `middleware.ts` sets with the current path plus search, so
 * the dashboard layout — which cannot read the request URL any other way —
 * can carry it through as the questionnaire's `redirect_url`.
 */
export const PATHNAME_HEADER = "x-temba-pathname";

/** Route the Onboarding questionnaire lives on. */
export const ONBOARDING_PATH = "/onboarding";

/** The fixture-fed Home preview: development-only and deliberately User-less. */
const DESIGN_PREVIEW_PREFIX = "/dashboard/design";

/** What the gate needs to know about the caller, read once per request. */
export type DashboardOnboardingState = {
  /**
   * No `user` row for the Clerk caller yet — the `user.created` webhook has
   * not landed. Treated as incomplete, never as `UNAUTHORIZED`.
   */
  provisioning: boolean;
  onboardingCompletedAt: Date | null;
};

/**
 * `/dashboard/design(.*)` is exempt in development, matching the branch in
 * `middleware.ts` that lets the fixture-fed Home preview render with no
 * signed-in User and no seeded row. Everything else under `/dashboard` is
 * gated.
 */
function isDesignPreviewPath(pathname: string) {
  const path = pathname.split("?")[0] ?? "";
  return (
    path === DESIGN_PREVIEW_PREFIX ||
    path.startsWith(`${DESIGN_PREVIEW_PREFIX}/`)
  );
}

/**
 * Where a `/dashboard/**` request should be sent, given the caller's
 * onboarding state and the path they asked for; `null` means let it render.
 *
 * An incomplete User — including one whose `user` row is still provisioning —
 * goes to the questionnaire with the requested path carried as `redirect_url`,
 * so finishing returns them to exactly where they were headed (an Invite
 * accept's `/dashboard/games/{id}` landing included). A complete User is never
 * redirected.
 *
 * The path goes through the shipped `safeInternalRedirect`; anything it
 * refuses — or a missing header — drops the `redirect_url` rather than
 * building an open-redirect door, and the questionnaire falls back to
 * `/dashboard`.
 */
export function dashboardOnboardingRedirect(args: {
  pathname: string | null | undefined;
  state: DashboardOnboardingState;
  /** True only in development, where the design preview bypasses the gate. */
  designPreviewExempt: boolean;
}): string | null {
  const { pathname, state, designPreviewExempt } = args;

  if (designPreviewExempt && pathname && isDesignPreviewPath(pathname)) {
    return null;
  }

  if (!state.provisioning && state.onboardingCompletedAt) {
    return null;
  }

  const redirectUrl = safeInternalRedirect(pathname);

  if (!redirectUrl) {
    return ONBOARDING_PATH;
  }

  const search = new URLSearchParams({ redirect_url: redirectUrl });

  return `${ONBOARDING_PATH}?${search.toString()}`;
}
