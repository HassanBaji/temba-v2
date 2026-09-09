"use client";

import { useState } from "react";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";

import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { GoogleIcon } from "~/components/ui/icons/google";
import { authCompleteUrl, ssoCallbackUrl } from "~/lib/auth-redirect";
import { clerkGlobalErrorMessage } from "~/lib/clerk-auth-error";

/**
 * OAuth providers actually enabled on this Clerk instance
 * (`user_settings.social` from the Frontend API environment).
 * Apple is not configured — omit the button rather than rendering one that errors.
 */
const ENABLED_OAUTH_PROVIDERS = [
  {
    strategy: "oauth_google" as const,
    label: "Continue with Google",
    Icon: GoogleIcon,
  },
] as const;

export function OauthButtons({
  flow,
  redirectUrl,
}: {
  flow: "sign-in" | "sign-up";
  redirectUrl: string | null;
}) {
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
    const redirectCallback = ssoCallbackUrl(
      flow === "sign-in" ? "/login" : "/signup",
      redirectUrl,
    );
    const complete = authCompleteUrl(redirectUrl);
    try {
      if (flow === "sign-in") {
        if (!signIn) {
          setPending(false);
          return;
        }
        await signIn.authenticateWithRedirect({
          strategy,
          redirectUrl: redirectCallback,
          redirectUrlComplete: complete,
        });
        return;
      }
      if (!signUp) {
        setPending(false);
        return;
      }
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: redirectCallback,
        redirectUrlComplete: complete,
      });
    } catch (err) {
      setPending(false);
      setError(clerkGlobalErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3.5">
        <div className="bg-rule h-px flex-1" />
        <span className="text-eyebrow text-muted-foreground font-mono">OR</span>
        <div className="bg-rule h-px flex-1" />
      </div>
      {error ? <FormErrorSummary message={error} /> : null}
      {ENABLED_OAUTH_PROVIDERS.map(({ strategy, label, Icon }) => (
        <Button
          key={strategy}
          type="button"
          size="auth"
          variant="outline"
          aria-busy={pending}
          disabled={!loaded || pending}
          className="border-rule bg-paper text-body hover:bg-wash w-full font-semibold"
          onClick={() => {
            void start(strategy);
          }}
        >
          <Icon />
          {label}
        </Button>
      ))}
    </div>
  );
}
