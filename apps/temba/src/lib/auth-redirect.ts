export type AuthCrossLinkTarget = "/" | "/login" | "/signup";
export type AuthSsoCallbackBase = "/login" | "/signup";
export type AuthAppPath = "/login/reset-password" | "/login/factor-two";

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
