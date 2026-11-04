"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

import { AuthLoading } from "~/components/auth/auth-loading";
import { useMessages } from "~/components/locale-provider";
import {
  authCompleteUrl,
  authCrossLinkUrl,
  signUpCompleteUrl,
} from "~/lib/auth-redirect";

function signupContinueUrl(redirectUrl: string | null): string {
  if (!redirectUrl) {
    return "/signup/continue";
  }
  return `/signup/continue?redirect_url=${encodeURIComponent(redirectUrl)}`;
}

export function SsoCallback({ redirectUrl }: { redirectUrl: string | null }) {
  const m = useMessages();
  const complete = authCompleteUrl(redirectUrl);
  const signUpComplete = signUpCompleteUrl(redirectUrl);

  return (
    <>
      <AuthLoading label={m.webAuth.sso.finishingSignIn} />
      {/* A new Google user arriving from /login is transferred to sign-up here, which runs bot protection. */}
      <div id="clerk-captcha" />
      <AuthenticateWithRedirectCallback
        continueSignUpUrl={signupContinueUrl(redirectUrl)}
        signInFallbackRedirectUrl={complete}
        signInForceRedirectUrl={complete}
        signInUrl={authCrossLinkUrl("/login", redirectUrl)}
        signUpFallbackRedirectUrl={signUpComplete}
        signUpForceRedirectUrl={signUpComplete}
        signUpUrl={authCrossLinkUrl("/login", redirectUrl)}
      />
    </>
  );
}
