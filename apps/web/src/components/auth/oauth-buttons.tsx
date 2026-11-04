"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";

import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { GoogleIcon } from "~/components/ui/icons/google";
import {
  authCompleteUrl,
  signUpCompleteUrl,
  ssoCallbackUrl,
} from "~/lib/auth-redirect";
import { clerkGlobalErrorMessage } from "@repo/domain/clerk-auth-error";
import { withGoogleLocale } from "@repo/domain/google-locale";
import type { SurfaceTone } from "@repo/domain/surface-tone";
import { cn } from "~/lib/utils";

/**
 * OAuth providers actually enabled on this Clerk instance
 * (`user_settings.social` from the Frontend API environment).
 * Apple is not configured — omit the button rather than rendering one that errors.
 */
const ENABLED_OAUTH_PROVIDERS = [
  {
    strategy: "oauth_google" as const,
    Icon: GoogleIcon,
  },
] as const;

export function OauthButtons({
  flow,
  redirectUrl,
  disabled = false,
  surface = "paper",
}: {
  flow: "sign-in" | "sign-up";
  redirectUrl: string | null;
  disabled?: boolean;
  surface?: SurfaceTone;
}) {
  const m = useMessages();
  const locale = useLocale();
  const clerk = useClerk();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = flow === "sign-in" ? signInLoaded : signUpLoaded;

  async function start(
    strategy: (typeof ENABLED_OAUTH_PROVIDERS)[number]["strategy"],
  ) {
    if (pending) {
      return;
    }
    setError(null);
    setPending(true);
    const redirectCallback = clerk.buildUrlWithAuth(
      ssoCallbackUrl(flow === "sign-in" ? "/login" : "/signup", redirectUrl),
    );
    const complete = authCompleteUrl(redirectUrl);
    const signUpComplete = signUpCompleteUrl(redirectUrl);
    // Clerk's authenticateWithRedirect gives no way to set Google's page
    // language, so this is its create-then-redirect with `hl` added.
    try {
      let googleUrl: URL | null;
      if (flow === "sign-in") {
        if (!signIn) {
          setPending(false);
          return;
        }
        const attempt = await signIn.create({
          strategy,
          redirectUrl: redirectCallback,
          actionCompleteRedirectUrl: complete,
        });
        googleUrl =
          attempt.firstFactorVerification.externalVerificationRedirectURL;
      } else {
        if (!signUp) {
          setPending(false);
          return;
        }
        const attempt = await signUp.create({
          strategy,
          redirectUrl: redirectCallback,
          actionCompleteRedirectUrl: signUpComplete,
          legalAccepted: true,
        });
        googleUrl =
          attempt.verifications.externalAccount.externalVerificationRedirectURL;
      }
      if (!googleUrl) {
        setPending(false);
        setError(m.auth.clerkError.generic);
        return;
      }
      window.location.assign(withGoogleLocale(googleUrl.toString(), locale));
    } catch (err) {
      setPending(false);
      setError(clerkGlobalErrorMessage(err, locale));
    }
  }

  const onInk = surface === "ink";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3.5">
        <div className={cn("h-px flex-1", onInk ? "bg-dimrule" : "bg-rule")} />
        <span
          className={cn(
            "text-eyebrow font-mono",
            onInk ? "text-dim" : "text-muted-foreground",
          )}
        >
          {m.webAuth.oauth.or}
        </span>
        <div className={cn("h-px flex-1", onInk ? "bg-dimrule" : "bg-rule")} />
      </div>
      {error ? <FormErrorSummary message={error} /> : null}
      {ENABLED_OAUTH_PROVIDERS.map(({ strategy, Icon }) => (
        <Button
          key={strategy}
          type="button"
          size="lg"
          variant={onInk ? "outline-inverse" : "outline"}
          aria-busy={pending}
          disabled={!loaded || pending || disabled}
          className={cn(
            "text-body w-full font-semibold",
            onInk ? "" : "border-rule bg-paper hover:bg-wash",
          )}
          onClick={() => {
            void start(strategy);
          }}
        >
          <Icon />
          {m.webAuth.oauth.continueWithGoogle}
        </Button>
      ))}
    </div>
  );
}
