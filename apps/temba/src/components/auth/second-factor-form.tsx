"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthScreen } from "~/components/auth/auth-screen";
import { VerifyCodeForm } from "~/components/auth/verify-code-form";
import { authCompleteUrl, authCrossLinkUrl } from "~/lib/auth-redirect";
import { splitClerkAuthError } from "~/lib/clerk-auth-error";
import type { SplitFormError } from "~/lib/form-mutation-error";

export function SecondFactorForm({
  redirectUrl,
}: {
  redirectUrl: string | null;
}) {
  const router = useRouter();
  const { setActive } = useClerk();
  const { signIn, isLoaded } = useSignIn();
  const completeUrl = authCompleteUrl(redirectUrl);
  const loginUrl = authCrossLinkUrl("/login", redirectUrl);

  const [code, setCode] = React.useState("");
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [pending, setPending] = React.useState(false);
  const [prepared, setPrepared] = React.useState(false);
  const [split, setSplit] = React.useState<SplitFormError | null>(null);

  React.useEffect(() => {
    document.getElementById("auth-screen-heading")?.focus();
  }, []);

  React.useEffect(() => {
    if (!isLoaded || !signIn || prepared || pending) {
      return;
    }
    if (signIn.status !== "needs_second_factor") {
      return;
    }
    setPending(true);
    void signIn
      .prepareSecondFactor({ strategy: "phone_code" })
      .then(() => {
        setStartedAt(Date.now());
        setPrepared(true);
        setPending(false);
      })
      .catch((err: unknown) => {
        setSplit(splitClerkAuthError(err));
        setPrepared(true);
        setPending(false);
      });
  }, [isLoaded, pending, prepared, signIn]);

  async function onVerify() {
    if (pending || !signIn) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "phone_code",
        code,
      });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({
          session: result.createdSessionId,
          redirectUrl: completeUrl,
        });
        router.replace(completeUrl);
        return;
      }
      setPending(false);
      setSplit({
        fieldErrors: {},
        globalMessage: "Something went wrong. Try again.",
      });
    } catch (err) {
      setSplit(splitClerkAuthError(err));
      setPending(false);
    }
  }

  async function onResend() {
    if (pending || !signIn) {
      return;
    }
    setPending(true);
    try {
      await signIn.prepareSecondFactor({ strategy: "phone_code" });
      setStartedAt(Date.now());
      setPending(false);
    } catch (err) {
      setSplit(splitClerkAuthError(err));
      setPending(false);
    }
  }

  if (!isLoaded) {
    return (
      <AuthScreen title="Check your phone">
        <p className="text-body text-muted-foreground">Loading…</p>
      </AuthScreen>
    );
  }

  if (signIn?.status !== "needs_second_factor") {
    return (
      <AuthScreen
        backHref={loginUrl}
        backLabel="Back"
        title="Check your phone"
        description="Start from sign in to continue."
      >
        <p className="text-body text-muted-foreground">
          <Link className="text-ink font-medium underline" href={loginUrl}>
            Sign in
          </Link>
        </p>
      </AuthScreen>
    );
  }

  const phone =
    signIn.supportedSecondFactors?.find(
      (factor) => factor.strategy === "phone_code",
    )?.safeIdentifier ?? "your number";

  return (
    <AuthScreen
      backHref={loginUrl}
      backLabel="Back"
      title="Enter the code"
      footer={
        <p className="text-eyebrow text-muted-foreground leading-[1.5]">
          Codes expire after a short time. Too many wrong tries will lock this
          identifier.
        </p>
      }
    >
      <VerifyCodeForm
        destination={phone}
        changeLabel="Sign in with a different account"
        onChangeIdentifier={() => {
          router.push(loginUrl);
        }}
        code={code}
        onCodeChange={setCode}
        onVerify={() => {
          void onVerify();
        }}
        onResend={() => {
          void onResend();
        }}
        startedAt={startedAt}
        pending={pending || !prepared}
        globalMessage={split?.globalMessage ?? null}
        codeError={split?.fieldErrors.code}
        codeInputId="second-factor-code"
      />
    </AuthScreen>
  );
}
