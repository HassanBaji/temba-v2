"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignUp } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthScreen } from "~/components/auth/auth-screen";
import { OauthButtons } from "~/components/auth/oauth-buttons";
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
import { authCompleteUrl, authCrossLinkUrl } from "~/lib/auth-redirect";
import { splitClerkAuthError } from "~/lib/clerk-auth-error";
import type { SplitFormError } from "~/lib/form-mutation-error";
import { cn } from "~/lib/utils";

const AUTH_INPUT_CLASS =
  "border-rule h-13 min-h-13 rounded-lg px-4 text-base md:text-base focus-visible:border-ink focus-visible:ring-0";

const FIELD_IDS = {
  emailAddress: "sign-up-email",
  username: "sign-up-username",
  phoneNumber: "sign-up-phone",
  password: "sign-up-password",
  code: "sign-up-code",
};

type Step = "details" | "verify-email" | "verify-phone";

type SignUpLike = {
  status: string | null;
  createdSessionId: string | null;
  unverifiedFields: string[];
};

function fieldElementId(param: string): string | undefined {
  switch (param) {
    case "email_address":
    case "emailAddress":
      return FIELD_IDS.emailAddress;
    case "username":
      return FIELD_IDS.username;
    case "phone_number":
    case "phoneNumber":
      return FIELD_IDS.phoneNumber;
    case "password":
      return FIELD_IDS.password;
    case "code":
      return FIELD_IDS.code;
    default:
      return undefined;
  }
}

function focusSplit(split: SplitFormError, extra: HTMLElement | null) {
  const firstField = Object.keys(split.fieldErrors)[0];
  const elementId = firstField ? fieldElementId(firstField) : undefined;
  if (elementId) {
    document.getElementById(elementId)?.focus();
    return;
  }
  extra?.focus();
}

export function SignUpForm({ redirectUrl }: { redirectUrl: string | null }) {
  const router = useRouter();
  const { setActive } = useClerk();
  const { signUp, isLoaded } = useSignUp();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const completeUrl = authCompleteUrl(redirectUrl);
  const signInUrl = authCrossLinkUrl("/login", redirectUrl);

  const [step, setStep] = React.useState<Step>("details");
  const [emailAddress, setEmailAddress] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [pending, setPending] = React.useState(false);
  const [split, setSplit] = React.useState<SplitFormError | null>(null);

  React.useEffect(() => {
    if (step === "details") {
      return;
    }
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
    return false;
  }

  async function prepareEmail() {
    await signUp?.prepareEmailAddressVerification({ strategy: "email_code" });
    setCode("");
    setStartedAt(Date.now());
    setStep("verify-email");
  }

  async function preparePhone() {
    await signUp?.preparePhoneNumberVerification({ strategy: "phone_code" });
    setCode("");
    setStartedAt(Date.now());
    setStep("verify-phone");
  }

  async function continueAfterResource(current: SignUpLike) {
    if (await completeIfReady(current.status, current.createdSessionId)) {
      return;
    }
    const unverified = current.unverifiedFields ?? [];
    if (unverified.includes("email_address")) {
      await prepareEmail();
      return;
    }
    if (unverified.includes("phone_number")) {
      await preparePhone();
      return;
    }
    setSplit({
      fieldErrors: {},
      globalMessage: "Something went wrong. Try again.",
    });
  }

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !signUp) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const created = await signUp.create({
        emailAddress,
        username,
        phoneNumber,
        password,
      });
      await continueAfterResource(created);
      setPending(false);
    } catch (err) {
      const next = splitClerkAuthError(err);
      setSplit(next);
      setPending(false);
      focusSplit(next, summaryRef.current);
    }
  }

  async function onVerify() {
    if (pending || !signUp) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result =
        step === "verify-email"
          ? await signUp.attemptEmailAddressVerification({ code })
          : await signUp.attemptPhoneNumberVerification({ code });
      if (await completeIfReady(result.status, result.createdSessionId)) {
        return;
      }
      const unverified = result.unverifiedFields ?? [];
      if (step === "verify-email" && unverified.includes("phone_number")) {
        await preparePhone();
        setPending(false);
        return;
      }
      if (step === "verify-phone" && unverified.includes("email_address")) {
        await prepareEmail();
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
    if (pending || !signUp) {
      return;
    }
    setPending(true);
    try {
      if (step === "verify-email") {
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
      } else {
        await signUp.preparePhoneNumberVerification({
          strategy: "phone_code",
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

  const verifying = step !== "details";
  const emailError =
    split?.fieldErrors.email_address ?? split?.fieldErrors.emailAddress;
  const usernameError = split?.fieldErrors.username;
  const phoneError =
    split?.fieldErrors.phone_number ?? split?.fieldErrors.phoneNumber;
  const passwordError = split?.fieldErrors.password;
  const codeError = split?.fieldErrors.code;

  return (
    <AuthScreen
      backHref={verifying ? undefined : authCrossLinkUrl("/", redirectUrl)}
      onBack={
        verifying
          ? () => {
              setStep("details");
              setSplit(null);
              setCode("");
            }
          : undefined
      }
      backLabel="Back"
      crossLink={verifying ? undefined : { href: signInUrl, label: "Sign in" }}
      title={verifying ? "Enter the code" : "Create account"}
      description={
        verifying
          ? undefined
          : "We send a six digit code to confirm your email."
      }
      footer={
        verifying ? (
          <p className="text-eyebrow text-muted-foreground leading-[1.5]">
            Codes expire after a short time. Too many wrong tries will lock this
            identifier.
          </p>
        ) : (
          <p className="text-eyebrow text-muted-foreground leading-[1.6]">
            By creating an account you agree to the{" "}
            <Link className="text-ink underline" href="/terms">
              Terms
            </Link>{" "}
            and{" "}
            <Link className="text-ink underline" href="/privacy">
              Privacy Policy
            </Link>
            .
          </p>
        )
      }
    >
      {verifying ? (
        <VerifyCodeForm
          destination={step === "verify-email" ? emailAddress : phoneNumber}
          changeLabel={
            step === "verify-email" ? "Change email" : "Change number"
          }
          onChangeIdentifier={() => {
            setStep("details");
            setSplit(null);
            setCode("");
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
          pending={pending}
          globalMessage={split?.globalMessage ?? null}
          codeError={codeError}
        />
      ) : (
        <form
          className="flex flex-col gap-[18px]"
          onSubmit={onCreate}
          noValidate
        >
          <FormErrorSummary ref={summaryRef} message={split?.globalMessage} />
          <div id="clerk-captcha" />
          <FieldGroup className="gap-[18px]">
            <Field>
              <FieldLabel
                htmlFor={FIELD_IDS.emailAddress}
                className="text-meta text-muted-foreground"
              >
                Email
              </FieldLabel>
              <Input
                id={FIELD_IDS.emailAddress}
                name="email"
                type="email"
                autoComplete="email"
                value={emailAddress}
                onChange={(event) => setEmailAddress(event.target.value)}
                aria-invalid={Boolean(emailError)}
                aria-describedby={
                  emailError ? `${FIELD_IDS.emailAddress}-error` : undefined
                }
                className={cn(AUTH_INPUT_CLASS)}
                disabled={pending}
              />
              {emailError ? (
                <FieldError id={`${FIELD_IDS.emailAddress}-error`}>
                  {emailError}
                </FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel
                htmlFor={FIELD_IDS.username}
                className="text-meta text-muted-foreground"
              >
                Username
              </FieldLabel>
              <Input
                id={FIELD_IDS.username}
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                aria-invalid={Boolean(usernameError)}
                aria-describedby={
                  usernameError ? `${FIELD_IDS.username}-error` : undefined
                }
                className={cn(AUTH_INPUT_CLASS)}
                disabled={pending}
              />
              {usernameError ? (
                <FieldError id={`${FIELD_IDS.username}-error`}>
                  {usernameError}
                </FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel
                htmlFor={FIELD_IDS.phoneNumber}
                className="text-meta text-muted-foreground"
              >
                Mobile number
              </FieldLabel>
              <Input
                id={FIELD_IDS.phoneNumber}
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                aria-invalid={Boolean(phoneError)}
                aria-describedby={
                  phoneError ? `${FIELD_IDS.phoneNumber}-error` : undefined
                }
                className={cn(AUTH_INPUT_CLASS)}
                disabled={pending}
              />
              {phoneError ? (
                <FieldError id={`${FIELD_IDS.phoneNumber}-error`}>
                  {phoneError}
                </FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel
                htmlFor={FIELD_IDS.password}
                className="text-meta text-muted-foreground"
              >
                Password
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
            Send code
          </Button>
          <OauthButtons flow="sign-up" redirectUrl={redirectUrl} />
        </form>
      )}
    </AuthScreen>
  );
}
