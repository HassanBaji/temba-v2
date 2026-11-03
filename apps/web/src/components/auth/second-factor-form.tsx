"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthLoading } from "~/components/auth/auth-loading";
import { AuthScreen } from "~/components/auth/auth-screen";
import { VerifyCodeForm } from "~/components/auth/verify-code-form";
import { useLocale, useMessages } from "~/components/locale-provider";
import { authCompleteUrl, authCrossLinkUrl } from "~/lib/auth-redirect";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import type { SplitFormError } from "~/lib/form-mutation-error";

const CODE_INPUT_ID = "second-factor-code";

function focusSplit(split: SplitFormError, summary: HTMLElement | null) {
  if (split.fieldErrors.code) {
    document.getElementById(CODE_INPUT_ID)?.focus();
    return;
  }
  summary?.focus();
}

export function SecondFactorForm({
  redirectUrl,
}: {
  redirectUrl: string | null;
}) {
  const router = useRouter();
  const m = useMessages();
  const locale = useLocale();
  const { setActive } = useClerk();
  const { signIn, isLoaded } = useSignIn();
  const completeUrl = authCompleteUrl(redirectUrl);
  const loginUrl = authCrossLinkUrl("/login", redirectUrl);
  const summaryRef = React.useRef<HTMLDivElement>(null);

  const [code, setCode] = React.useState("");
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [pending, setPending] = React.useState(false);
  const [prepared, setPrepared] = React.useState(false);
  const [split, setSplit] = React.useState<SplitFormError | null>(null);

  React.useEffect(() => {
    document.getElementById("auth-screen-heading")?.focus();
  }, []);

  // After render, so the code input is enabled and the summary is mounted.
  React.useEffect(() => {
    if (split) {
      focusSplit(split, summaryRef.current);
    }
  }, [split]);

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
        setSplit(splitClerkAuthError(err, locale));
        setPrepared(true);
        setPending(false);
      });
  }, [isLoaded, locale, pending, prepared, signIn]);

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
        globalMessage: m.auth.clerkError.generic,
      });
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
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
      setSplit(splitClerkAuthError(err, locale));
      setPending(false);
    }
  }

  if (!isLoaded) {
    return (
      <AuthScreen title={m.webAuth.secondFactor.checkYourPhone}>
        <AuthLoading />
      </AuthScreen>
    );
  }

  if (signIn?.status !== "needs_second_factor") {
    return (
      <AuthScreen
        backHref={loginUrl}
        title={m.webAuth.secondFactor.checkYourPhone}
        description={m.webAuth.secondFactor.startFromSignIn}
      >
        <p className="text-body text-muted-foreground">
          <Link className="text-ink font-medium underline" href={loginUrl}>
            {m.common.signIn}
          </Link>
        </p>
      </AuthScreen>
    );
  }

  const phone =
    signIn.supportedSecondFactors?.find(
      (factor) => factor.strategy === "phone_code",
    )?.safeIdentifier ?? m.webAuth.signUpContinue.yourNumber;

  return (
    <AuthScreen
      backHref={loginUrl}
      title={m.webAuth.signUpContinue.enterTheCode}
      footer={
        <p className="text-eyebrow text-muted-foreground leading-[1.5]">
          {m.webAuth.phoneAuth.codesExpire.account}
        </p>
      }
    >
      <VerifyCodeForm
        destination={phone}
        changeLabel={m.webAuth.secondFactor.differentAccount}
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
        codeInputId={CODE_INPUT_ID}
        summaryRef={summaryRef}
      />
    </AuthScreen>
  );
}
