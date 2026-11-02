"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthScreen } from "~/components/auth/auth-screen";
import { AuthTermsNote } from "~/components/auth/auth-terms-note";
import { OauthButtons } from "~/components/auth/oauth-buttons";
import {
  PasswordField,
  PasswordStrengthMeter,
} from "~/components/auth/password-field";
import { PhoneField } from "~/components/auth/phone-field";
import { VerifyCodeForm } from "~/components/auth/verify-code-form";
import { Button, touchHitArea } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
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
  signUpCompleteUrl,
} from "~/lib/auth-redirect";
import { hasClerkErrorCode } from "~/lib/clerk-error-code";
import type { SplitFormError } from "~/lib/form-mutation-error";
import { isPasswordLongEnough, PASSWORD_HINT } from "~/lib/password-strength";
import {
  PHONE_AUTH_TITLES,
  hasPasswordFactor,
  previousPhoneAuthStep,
  signUpStepProgress,
  type PhoneAuthStep,
} from "~/lib/phone-auth-flow";
import { cn } from "~/lib/utils";
import {
  CLERK_AUTH_ERROR_COPY,
  GENERIC_CLERK_AUTH_ERROR,
  splitClerkAuthError,
} from "@repo/domain/clerk-auth-error";
import { initials } from "@repo/domain/initials";
import {
  DEFAULT_CALLING_COUNTRY_ISO,
  assembleE164,
  formatInternationalNumber,
} from "@repo/domain/phone-number";
import {
  userDisplayName,
  validateUserNames,
} from "@repo/domain/user-display-name";

const FIELD_IDS = {
  phone: "phone-auth-phone",
  code: "phone-auth-code",
  firstName: "phone-auth-first-name",
  lastName: "phone-auth-last-name",
  password: "phone-auth-password",
  passwordHint: "phone-auth-password-hint",
};

function fieldElementId(param: string): string | undefined {
  switch (param) {
    case "identifier":
    case "phone_number":
    case "phoneNumber":
      return FIELD_IDS.phone;
    case "code":
      return FIELD_IDS.code;
    case "first_name":
    case "firstName":
      return FIELD_IDS.firstName;
    case "last_name":
    case "lastName":
      return FIELD_IDS.lastName;
    case "password":
      return FIELD_IDS.password;
    default:
      return undefined;
  }
}

function focusSplit(split: SplitFormError, summary: HTMLElement | null) {
  const firstField = Object.keys(split.fieldErrors)[0];
  const elementId = firstField ? fieldElementId(firstField) : undefined;
  if (elementId) {
    document.getElementById(elementId)?.focus();
    return;
  }
  summary?.focus();
}

const GENERIC_SPLIT: SplitFormError = {
  fieldErrors: {},
  globalMessage: GENERIC_CLERK_AUTH_ERROR,
};

function phoneFormatSplit(): SplitFormError {
  return {
    fieldErrors: {
      phone_number:
        CLERK_AUTH_ERROR_COPY.form_param_format_invalid ??
        "That doesn't look right. Check the format and try again.",
    },
    globalMessage: null,
  };
}

function PreviewCard({ name, phone }: { name: string | null; phone: string }) {
  const shown = name ?? "Your name";
  return (
    <div className="border-rule flex items-center gap-3.5 rounded-[14px] border px-4 py-3.5">
      <span
        aria-hidden="true"
        className="bg-ink text-paper text-body flex size-11 shrink-0 items-center justify-center rounded-lg font-semibold"
      >
        {name ? initials(name) : "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-body truncate font-semibold",
            name ? "text-ink" : "text-muted-foreground",
          )}
        >
          {shown}
        </p>
        <p className="text-meta text-muted-foreground truncate">{phone}</p>
      </div>
      <span className="text-eyebrow text-muted-foreground shrink-0 font-mono uppercase">
        Preview
      </span>
    </div>
  );
}

/**
 * The one door: phone, then a password for a known number, or a code, a name
 * and a new password for a new one (ADR-0049, ADR-0050). `signIn.create`
 * decides which it is: `form_identifier_not_found` switches to a sign-up on
 * the same number. The code is sent only on sign-up.
 */
export function PhoneAuthForm({ redirectUrl }: { redirectUrl: string | null }) {
  const router = useRouter();
  const { setActive } = useClerk();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const completeUrl = authCompleteUrl(redirectUrl);
  const isLoaded = signInLoaded && signUpLoaded;

  const [step, setStep] = React.useState<PhoneAuthStep>("phone");
  const [countryIso, setCountryIso] = React.useState(
    DEFAULT_CALLING_COUNTRY_ISO,
  );
  const [national, setNational] = React.useState("");
  const [code, setCode] = React.useState("");
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [split, setSplit] = React.useState<SplitFormError | null>(null);

  // After render, so the input is enabled again and the summary is mounted.
  React.useEffect(() => {
    if (split) {
      focusSplit(split, summaryRef.current);
    }
  }, [split]);

  React.useEffect(() => {
    if (step === "phone") {
      return;
    }
    document.getElementById("auth-screen-heading")?.focus();
  }, [step]);

  function goTo(next: PhoneAuthStep) {
    setSplit(null);
    setStep(next);
  }

  function back() {
    const previous = previousPhoneAuthStep(step);
    if (!previous) {
      return;
    }
    if (previous === "phone") {
      setCode("");
      setPassword("");
    }
    goTo(previous);
  }

  async function activate(sessionId: string, url: string) {
    await setActive({ session: sessionId, redirectUrl: url });
    router.replace(url);
  }

  async function finishSignIn(result: {
    status: string | null;
    createdSessionId: string | null;
  }): Promise<boolean> {
    if (result.status === "complete" && result.createdSessionId) {
      await activate(result.createdSessionId, completeUrl);
      return true;
    }
    if (result.status === "needs_second_factor") {
      router.push(authAppPathUrl("/login/factor-two", redirectUrl));
      return true;
    }
    return false;
  }

  async function finishSignUpIfComplete(result: {
    status: string | null;
    createdSessionId: string | null;
  }): Promise<boolean> {
    if (result.status === "complete" && result.createdSessionId) {
      await activate(result.createdSessionId, signUpCompleteUrl(redirectUrl));
      return true;
    }
    return false;
  }

  async function onContinue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !signIn || !signUp) {
      return;
    }
    const assembled = assembleE164(countryIso, national);
    if (!assembled.ok) {
      setSplit(phoneFormatSplit());
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      try {
        const attempt = await signIn.create({ identifier: assembled.e164 });
        if (!hasPasswordFactor(attempt.supportedFirstFactors)) {
          setSplit({
            fieldErrors: {},
            globalMessage:
              "This account has no password. Sign in with Google instead.",
          });
          setPending(false);
          return;
        }
        setPassword("");
        goTo("password");
        setPending(false);
        return;
      } catch (err) {
        if (!hasClerkErrorCode(err, "form_identifier_not_found")) {
          throw err;
        }
        await signUp.create({
          phoneNumber: assembled.e164,
          legalAccepted: true,
        });
        await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
      }
      setCode("");
      setStartedAt(Date.now());
      goTo("code");
      setPending(false);
    } catch (err) {
      setSplit(splitClerkAuthError(err));
      setPending(false);
    }
  }

  async function onVerify() {
    if (pending || !signUp) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signUp.attemptPhoneNumberVerification({ code });
      if (await finishSignUpIfComplete(result)) {
        return;
      }
      goTo("name");
      setPending(false);
    } catch (err) {
      setSplit(splitClerkAuthError(err));
      setPending(false);
    }
  }

  async function onResend() {
    if (pending || !signUp) {
      return;
    }
    setPending(true);
    try {
      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
      setStartedAt(Date.now());
      setPending(false);
    } catch (err) {
      setSplit(splitClerkAuthError(err));
      setPending(false);
    }
  }

  async function onSignInWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !signIn) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "password",
        password,
      });
      if (await finishSignIn(result)) {
        return;
      }
      setSplit(GENERIC_SPLIT);
      setPending(false);
    } catch (err) {
      setSplit(splitClerkAuthError(err));
      setPending(false);
    }
  }

  async function onSaveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !signUp) {
      return;
    }
    const names = validateUserNames({ firstName, lastName });
    if (!names.ok) {
      setSplit({ fieldErrors: names.fieldErrors, globalMessage: null });
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signUp.update({
        firstName: names.firstName,
        lastName: names.lastName,
      });
      if (await finishSignUpIfComplete(result)) {
        return;
      }
      setPassword("");
      goTo("new-password");
      setPending(false);
    } catch (err) {
      setSplit(splitClerkAuthError(err));
      setPending(false);
    }
  }

  async function onCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !signUp || !isPasswordLongEnough(password)) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signUp.update({ password });
      if (await finishSignUpIfComplete(result)) {
        return;
      }
      setSplit(GENERIC_SPLIT);
      setPending(false);
    } catch (err) {
      setSplit(splitClerkAuthError(err));
      setPending(false);
    }
  }

  const phoneError =
    split?.fieldErrors.phone_number ??
    split?.fieldErrors.phoneNumber ??
    split?.fieldErrors.identifier;
  const formattedPhone = formatInternationalNumber(countryIso, national);
  const title = PHONE_AUTH_TITLES[step];

  if (step === "password") {
    const passwordError = split?.fieldErrors.password;
    return (
      <AuthScreen
        onBack={back}
        backLabel="Back"
        title={title}
        description={`For ${formattedPhone}.`}
      >
        <form
          className="flex flex-col gap-[18px]"
          onSubmit={onSignInWithPassword}
          noValidate
        >
          <FormErrorSummary ref={summaryRef} message={split?.globalMessage} />
          <Field>
            <FieldLabel
              htmlFor={FIELD_IDS.password}
              className="text-meta text-muted-foreground"
            >
              Password
            </FieldLabel>
            <PasswordField
              id={FIELD_IDS.password}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              placeholder="Enter your password"
              invalid={Boolean(passwordError)}
              describedBy={
                passwordError ? `${FIELD_IDS.password}-error` : undefined
              }
              disabled={pending}
            />
            {passwordError ? (
              <FieldError id={`${FIELD_IDS.password}-error`}>
                {passwordError}
              </FieldError>
            ) : null}
          </Field>
          <Button
            type="submit"
            size="lg"
            pending={pending}
            pendingLabel="Signing in…"
            disabled={password.length === 0}
            className="w-full font-semibold"
          >
            Sign in
          </Button>
          <p className="text-center">
            <button
              type="button"
              className={cn(
                touchHitArea,
                "text-body text-ink focus-visible:ring-ring/50 rounded-sm underline outline-none focus-visible:ring-[3px]",
              )}
              disabled={pending}
              onClick={back}
            >
              Change number
            </button>
          </p>
        </form>
      </AuthScreen>
    );
  }

  if (step === "code") {
    return (
      <AuthScreen
        onBack={back}
        backLabel="Back"
        title={title}
        footer={
          <p className="text-eyebrow text-muted-foreground leading-[1.5]">
            Codes expire after a short time. Too many wrong tries will lock this
            number.
          </p>
        }
      >
        <VerifyCodeForm
          destination={formattedPhone}
          changeLabel="Change number"
          onChangeIdentifier={back}
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
          codeError={split?.fieldErrors.code}
          codeInputId={FIELD_IDS.code}
          summaryRef={summaryRef}
        />
      </AuthScreen>
    );
  }

  if (step === "name") {
    const firstNameError =
      split?.fieldErrors.firstName ?? split?.fieldErrors.first_name;
    const lastNameError =
      split?.fieldErrors.lastName ?? split?.fieldErrors.last_name;
    return (
      <AuthScreen
        onBack={back}
        backLabel="Back"
        progress={signUpStepProgress(step)}
        title={title}
        description="Shown to organizers and the people you play with."
      >
        <form
          className="flex flex-col gap-[18px]"
          onSubmit={onSaveName}
          noValidate
        >
          <FormErrorSummary ref={summaryRef} message={split?.globalMessage} />
          <FieldGroup className="gap-[18px]">
            <Field>
              <FieldLabel
                htmlFor={FIELD_IDS.firstName}
                className="text-meta text-muted-foreground"
              >
                First name
              </FieldLabel>
              <Input
                id={FIELD_IDS.firstName}
                name="firstName"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                aria-invalid={Boolean(firstNameError)}
                aria-describedby={
                  firstNameError ? `${FIELD_IDS.firstName}-error` : undefined
                }
                size="lg"
                disabled={pending}
              />
              {firstNameError ? (
                <FieldError id={`${FIELD_IDS.firstName}-error`}>
                  {firstNameError}
                </FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel
                htmlFor={FIELD_IDS.lastName}
                className="text-meta text-muted-foreground"
              >
                Last name
              </FieldLabel>
              <Input
                id={FIELD_IDS.lastName}
                name="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                aria-invalid={Boolean(lastNameError)}
                aria-describedby={
                  lastNameError ? `${FIELD_IDS.lastName}-error` : undefined
                }
                size="lg"
                disabled={pending}
              />
              {lastNameError ? (
                <FieldError id={`${FIELD_IDS.lastName}-error`}>
                  {lastNameError}
                </FieldError>
              ) : null}
            </Field>
          </FieldGroup>
          <PreviewCard
            name={userDisplayName({ firstName, lastName })}
            phone={formattedPhone}
          />
          <Button
            type="submit"
            size="lg"
            pending={pending}
            pendingLabel="Saving…"
            className="w-full font-semibold"
          >
            Continue
          </Button>
          <p className="text-eyebrow text-muted-foreground text-center leading-[1.6]">
            Photo, email, sports and level can be added later from Profile.
          </p>
        </form>
      </AuthScreen>
    );
  }

  if (step === "new-password") {
    const passwordError = split?.fieldErrors.password;
    const describedBy = [
      FIELD_IDS.passwordHint,
      passwordError ? `${FIELD_IDS.password}-error` : null,
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <AuthScreen
        onBack={back}
        backLabel="Back"
        progress={signUpStepProgress(step)}
        title={title}
        description="For signing in on a new phone."
      >
        <form
          className="flex flex-col gap-[18px]"
          onSubmit={onCreateAccount}
          noValidate
        >
          <FormErrorSummary ref={summaryRef} message={split?.globalMessage} />
          <Field>
            <FieldLabel
              htmlFor={FIELD_IDS.password}
              className="text-meta text-muted-foreground"
            >
              Password
            </FieldLabel>
            <PasswordField
              id={FIELD_IDS.password}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              invalid={Boolean(passwordError)}
              describedBy={describedBy}
              disabled={pending}
            />
            <PasswordStrengthMeter password={password} />
            <FieldDescription id={FIELD_IDS.passwordHint}>
              {PASSWORD_HINT}
            </FieldDescription>
            {passwordError ? (
              <FieldError id={`${FIELD_IDS.password}-error`}>
                {passwordError}
              </FieldError>
            ) : null}
          </Field>
          <Button
            type="submit"
            size="lg"
            pending={pending}
            pendingLabel="Creating account…"
            disabled={!isPasswordLongEnough(password)}
            className="w-full font-semibold"
          >
            Create account
          </Button>
          <p className="text-eyebrow text-muted-foreground text-center leading-[1.6]">
            You can change it later from Settings.
          </p>
        </form>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      backHref={authCrossLinkUrl("/", redirectUrl)}
      backLabel="Back"
      title={title}
      description="Known numbers sign in with a password. If the number is new to us, we text a six digit code and create your account."
      footer={
        <p className="text-meta text-muted-foreground flex items-baseline justify-between gap-3">
          <span>Invited to a Group?</span>
          <span className="text-ink font-medium">Open your invite link.</span>
        </p>
      }
    >
      <form
        className="flex flex-col gap-[18px]"
        onSubmit={onContinue}
        noValidate
      >
        <FormErrorSummary ref={summaryRef} message={split?.globalMessage} />
        <div id="clerk-captcha" />
        <Field>
          <FieldLabel
            htmlFor={FIELD_IDS.phone}
            className="text-meta text-muted-foreground"
          >
            Mobile number
          </FieldLabel>
          <PhoneField
            id={FIELD_IDS.phone}
            name="phone"
            countryIso={countryIso}
            national={national}
            onCountryIsoChange={setCountryIso}
            onNationalChange={setNational}
            invalid={Boolean(phoneError)}
            describedBy={phoneError ? `${FIELD_IDS.phone}-error` : undefined}
            disabled={pending}
          />
          {phoneError ? (
            <FieldError id={`${FIELD_IDS.phone}-error`}>
              {phoneError}
            </FieldError>
          ) : null}
        </Field>
        <Button
          type="submit"
          size="lg"
          pending={pending}
          pendingLabel="Checking…"
          disabled={!isLoaded}
          className="w-full font-semibold"
        >
          Continue
        </Button>
        <AuthTermsNote lead="Standard SMS rates may apply." />
        <OauthButtons flow="sign-in" redirectUrl={redirectUrl} />
      </form>
    </AuthScreen>
  );
}
