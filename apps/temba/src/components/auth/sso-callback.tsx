"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

import { Skeleton } from "~/components/ui/skeleton";
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
    <div className="flex flex-col gap-4">
      <Skeleton className="h-13 w-full rounded-lg" />
      <p className="text-body text-muted-foreground">Finishing sign in…</p>
      <AuthenticateWithRedirectCallback
        continueSignUpUrl={signupContinueUrl(redirectUrl)}
        signInFallbackRedirectUrl={complete}
        signInForceRedirectUrl={complete}
        signInUrl={authCrossLinkUrl("/login", redirectUrl)}
        signUpFallbackRedirectUrl={complete}
        signUpForceRedirectUrl={complete}
        signUpUrl={authCrossLinkUrl("/signup", redirectUrl)}
      />
    </div>
  );
}
