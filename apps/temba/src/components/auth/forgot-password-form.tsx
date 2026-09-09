"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthScreen } from "~/components/auth/auth-screen";
import { VerifyCodeForm } from "~/components/auth/verify-code-form";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import {
  authAppPathUrl,
  authCompleteUrl,
  authCrossLinkUrl,
} from "~/lib/auth-redirect";
import { splitClerkAuthError } from "~/lib/clerk-auth-error";
import type { SplitFormError } from "~/lib/form-mutation-error";
import { cn } from "~/lib/utils";

const AUTH_INPUT_CLASS =
  "border-rule h-13 min-h-13 rounded-lg px-4 text-base md:text-base focus-visible:border-ink focus-visible:ring-0";

const FIELD_IDS = {
  identifier: "reset-password-identifier",
  password: "reset-password-password",
  code: "reset-password-code",
};

type Step = "identifier" | "code" | "password";

function resetEmailCodePrepareParams(signIn: {
  supportedFirstFactors: Array<{ strategy: string; emailAddressId?: string }> | null;
}) {
  const factor = signIn.supportedFirstFactors?.find(
    (item) => item.strategy === "reset_password_email_code",
  );
  if (!factor?.emailAddressId) {
    return null;
  }
  return {
    strategy: "reset_password_email_code" as const,
    emailAddressId: factor.emailAddressId,
  };
}

function focusSplit(split: SplitFormError, extra: HTMLElement | null) {
  const firstField = Object.keys(split.fieldErrors)[0];
  if (firstField === "identifier") {
    document.getElementById(FIELD_IDS.identifier)?.focus();
    return;
  }
  if (firstField === "password") {
    document.getElementById(FIELD_IDS.password)?.focus();
    return;
  }
  if (firstField === "code") {
    document.getElementById(FIELD_IDS.code)?.focus();
    return;
  }
  extra?.focus();
}

export function ForgotPasswordForm({
  redirectUrl,
}: {
  redirectUrl: string | null;
}) {
  const router = useRouter();
  const { setActive } = useClerk();
  const { signIn, isLoaded } = useSignIn();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const completeUrl = authCompleteUrl(redirectUrl);
  const loginUrl = authCrossLinkUrl("/login", redirectUrl);

  const [step, setStep] = React.useState<Step>("identifier");
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [pending, setPending] = React.useState(false);
  const [split, setSplit] = React.useState<SplitFormError | null>(null);

  React.useEffect(() => {
    document.getElementById("auth-screen-heading")?.focus();
  }, [step]);

  async function completeIfReady(
    status: string | null | undefined,
    sessionId: string | null | undefined,
  ) {
    if (status === "complete" && sessionId) {
      await setActive({ session: sessionId, redirectUrl: completeUrl });
      router.replace(completeUrl);
      return true;
    }
    if (status === "needs_second_factor") {
      router.push(authAppPathUrl("/login/factor-two", redirectUrl));
      return true;
    }
    return false;
  }

  async function onSendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !signIn) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier,
      });
      setCode("");
      setStartedAt(Date.now());
      setStep("code");
      setPending(false);
    } catch (err) {
      const next = splitClerkAuthError(err);
      setSplit(next);
      setPending(false);
      focusSplit(next, summaryRef.current);
    }
  }

  async function onVerifyCode() {
    if (pending || !signIn) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
      });
      if (await completeIfReady(result.status, result.createdSessionId)) {
        return;
      }
      if (result.status === "needs_new_password") {
        setPassword("");
        setStep("password");
        setPending(false);
        return;
      }
      setPending(false);
      setSplit({
        fieldErrors: {},
        globalMessage: "Something went wrong. Try again.",
      });
    } catch (err) {
      const next = splitClerkAuthError(err);
      setSplit(next);
      setPending(false);
      focusSplit(next, summaryRef.current);
    }
  }

  async function onResend() {
    if (pending || !signIn) {
      return;
    }
    setPending(true);
    try {
      const params = resetEmailCodePrepareParams(signIn);
      if (params) {
        await signIn.prepareFirstFactor(params);
      } else {
        await signIn.create({
          strategy: "reset_password_email_code",
          identifier,
        });
      }
      setStartedAt(Date.now());
      setPending(false);
    } catch (err) {
      const next = splitClerkAuthError(err);
      setSplit(next);
      setPending(false);
    }
  }

  async function onResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !signIn) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signIn.resetPassword({ password });
      if (await completeIfReady(result.status, result.createdSessionId)) {
        return;
      }
      setPending(false);
      setSplit({
        fieldErrors: {},
        globalMessage: "Something went wrong. Try again.",
      });
      summaryRef.current?.focus();
    } catch (err) {
      const next = splitClerkAuthError(err);
      setSplit(next);
      setPending(false);
      focusSplit(next, summaryRef.current);
    }
  }

  const identifierError = split?.fieldErrors.identifier;
  const passwordError = split?.fieldErrors.password;
  const codeError = split?.fieldErrors.code;

  if (step === "code") {
    return (
      <AuthScreen
        onBack={() => {
          setStep("identifier");
          setSplit(null);
          setCode("");
        }}
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
          destination={identifier}
          changeLabel="Change email"
          onChangeIdentifier={() => {
            setStep("identifier");
            setSplit(null);
            setCode("");
          }}
          code={code}
          onCodeChange={setCode}
          onVerify={() => {
            void onVerifyCode();
          }}
          onResend={() => {
            void onResend();
          }}
          startedAt={startedAt}
          pending={pending}
          globalMessage={split?.globalMessage ?? null}
          codeError={codeError}
          codeInputId={FIELD_IDS.code}
        />
      </AuthScreen>
    );
  }

  if (step === "password") {
    return (
      <AuthScreen
        backHref={loginUrl}
        backLabel="Back"
        title="Set a new password"
        description="Code confirmed. Choose a new password to finish signing in."
      >
        <form
          className="flex flex-col gap-[18px]"
          onSubmit={onResetPassword}
          noValidate
        >
          <FormErrorSummary ref={summaryRef} message={split?.globalMessage} />
          <FieldGroup className="gap-[18px]">
            <Field>
              <FieldLabel
                htmlFor={FIELD_IDS.password}
                className="text-meta text-muted-foreground"
              >
                New password
              </FieldLabel>
              <Input
                id={FIELD_IDS.password}
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={
                  passwordError ? `${FIELD_IDS.password}-error` : undefined
                }
                className={cn(AUTH_INPUT_CLASS)}
                disabled={pending}
              />
              {passwordError ? (
                <FieldError id={`${FIELD_IDS.password}-error`}>
                  {passwordError}
                </FieldError>
              ) : null}
            </Field>
          </FieldGroup>
          <Button
            type="submit"
            size="auth"
            aria-busy={pending}
            disabled={!isLoaded || pending}
            className="bg-ink text-paper hover:bg-dimrule w-full font-semibold"
          >
            Save password
          </Button>
        </form>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      backHref={loginUrl}
      backLabel="Back"
      title="Forgot password"
      description="We’ll email a six digit code so you can choose a new password."
    >
      <form
        className="flex flex-col gap-[18px]"
        onSubmit={onSendCode}
        noValidate
      >
        <FormErrorSummary ref={summaryRef} message={split?.globalMessage} />
        <FieldGroup className="gap-[18px]">
          <Field>
            <FieldLabel
              htmlFor={FIELD_IDS.identifier}
              className="text-meta text-muted-foreground"
            >
              Email
            </FieldLabel>
            <Input
              id={FIELD_IDS.identifier}
              name="identifier"
              type="email"
              autoComplete="email"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              aria-invalid={Boolean(identifierError)}
              aria-describedby={
                identifierError ? `${FIELD_IDS.identifier}-error` : undefined
              }
              className={cn(AUTH_INPUT_CLASS)}
              disabled={pending}
            />
            {identifierError ? (
              <FieldError id={`${FIELD_IDS.identifier}-error`}>
                {identifierError}
              </FieldError>
            ) : null}
          </Field>
        </FieldGroup>
        <Button
          type="submit"
          size="auth"
          aria-busy={pending}
          disabled={!isLoaded || pending}
          className="bg-ink text-paper hover:bg-dimrule w-full font-semibold"
        >
          Send code
        </Button>
      </form>
    </AuthScreen>
  );
}
