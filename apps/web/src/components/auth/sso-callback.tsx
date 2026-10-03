"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

import { AuthLoading } from "~/components/auth/auth-loading";
import { authCompleteUrl, authCrossLinkUrl } from "~/lib/auth-redirect";

function signupContinueUrl(redirectUrl: string | null): string {
  if (!redirectUrl) {
    return "/signup/continue";
  }
  return `/signup/continue?redirect_url=${encodeURIComponent(redirectUrl)}`;
}

export function SsoCallback({ redirectUrl }: { redirectUrl: string | null }) {
  const complete = authCompleteUrl(redirectUrl);

  return (
    <>
      <AuthLoading label="Finishing sign in…" />
      {/* A new Google user arriving from /login is transferred to sign-up here, which runs bot protection. */}
      <div id="clerk-captcha" />
      <AuthenticateWithRedirectCallback
        continueSignUpUrl={signupContinueUrl(redirectUrl)}
        signInFallbackRedirectUrl={complete}
        signInForceRedirectUrl={complete}
        signInUrl={authCrossLinkUrl("/login", redirectUrl)}
        signUpFallbackRedirectUrl={complete}
        signUpForceRedirectUrl={complete}
        signUpUrl={authCrossLinkUrl("/signup", redirectUrl)}
      />
    </>
  );
}
