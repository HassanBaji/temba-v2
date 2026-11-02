export type AuthCrossLinkTarget = "/" | "/login" | "/signup";
export type AuthSsoCallbackBase = "/login" | "/signup";
export type AuthAppPath = "/login/factor-two";

function withRedirectQuery(path: string, redirectUrl: string | null): string {
  if (!redirectUrl) {
    return path;
  }
  return `${path}?redirect_url=${encodeURIComponent(redirectUrl)}`;
}

export function authCrossLinkUrl(
  target: AuthCrossLinkTarget,
  redirectUrl: string | null,
): string {
  return withRedirectQuery(target, redirectUrl);
}

export function authCompleteUrl(redirectUrl: string | null): string {
  return redirectUrl ?? "/dashboard";
}

/**
 * Where a finished sign-up lands: the Profile checklist's "You're in" screen,
 * which carries the `redirect_url` so "Later, show me games" ends where the
 * User was going.
 */
export function signUpCompleteUrl(redirectUrl: string | null): string {
  const search = new URLSearchParams({ fresh: "1" });
  if (redirectUrl) {
    search.set("redirect_url", redirectUrl);
  }
  return `/onboarding?${search.toString()}`;
}

export function ssoCallbackUrl(
  base: AuthSsoCallbackBase,
  redirectUrl: string | null,
): string {
  return withRedirectQuery(`${base}/sso-callback`, redirectUrl);
}

export function authAppPathUrl(
  path: AuthAppPath,
  redirectUrl: string | null,
): string {
  return withRedirectQuery(path, redirectUrl);
}
