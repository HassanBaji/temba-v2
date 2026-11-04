"use client";

import { useState } from "react";
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
    const signUpComplete = signUpCompleteUrl(redirectUrl);
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
        redirectUrlComplete: signUpComplete,
        legalAccepted: true,
      });
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
