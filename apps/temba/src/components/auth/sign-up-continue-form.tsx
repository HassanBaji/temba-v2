"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignUp } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthScreen } from "~/components/auth/auth-screen";
import { OauthButtons } from "~/components/auth/oauth-buttons";
import { PhoneField } from "~/components/auth/phone-field";
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
import {
  CLERK_AUTH_ERROR_COPY,
  splitClerkAuthError,
} from "~/lib/clerk-auth-error";
import type { SplitFormError } from "~/lib/form-mutation-error";
import {
  DEFAULT_CALLING_COUNTRY_ISO,
  assembleE164,
  formatInternationalNumber,
} from "~/lib/phone-number";
import { cn } from "~/lib/utils";

const AUTH_INPUT_CLASS =
  "border-rule h-13 min-h-13 rounded-lg px-4 text-base md:text-base focus-visible:border-ink focus-visible:ring-0";

const FIELD_IDS = {
  username: "signup-continue-username",
  emailAddress: "signup-continue-email",
  phoneNumber: "signup-continue-phone",
  password: "signup-continue-password",
  firstName: "signup-continue-first-name",
  lastName: "signup-continue-last-name",
  code: "sign-up-code",
};

type Step = "fields" | "verify-email" | "verify-phone";

type SignUpLike = {
  status: string | null;
  createdSessionId: string | null;
  missingFields: string[];
  unverifiedFields: string[];
  emailAddress: string | null;
  phoneNumber: string | null;
};

function isMissing(signUp: { missingFields: string[] }, field: string) {
  return signUp.missingFields.includes(field);
}

function fieldElementId(param: string): string | undefined {
  switch (param) {
    case "username":
      return FIELD_IDS.username;
    case "email_address":
    case "emailAddress":
      return FIELD_IDS.emailAddress;
    case "phone_number":
    case "phoneNumber":
      return FIELD_IDS.phoneNumber;
    case "password":
      return FIELD_IDS.password;
    case "first_name":
    case "firstName":
      return FIELD_IDS.firstName;
    case "last_name":
    case "lastName":
      return FIELD_IDS.lastName;
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

export function SignUpContinueForm({
  redirectUrl,
}: {
  redirectUrl: string | null;
}) {
  const router = useRouter();
  const { setActive } = useClerk();
  const { signUp, isLoaded } = useSignUp();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const completeUrl = authCompleteUrl(redirectUrl);
  const signInUrl = authCrossLinkUrl("/login", redirectUrl);
  const signUpUrl = authCrossLinkUrl("/signup", redirectUrl);

  const [step, setStep] = React.useState<Step>("fields");
  const [username, setUsername] = React.useState("");
  const [emailAddress, setEmailAddress] = React.useState("");
  const [countryIso, setCountryIso] = React.useState(
    DEFAULT_CALLING_COUNTRY_ISO,
  );
  const [national, setNational] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [pending, setPending] = React.useState(false);
  const [split, setSplit] = React.useState<SplitFormError | null>(null);

  React.useEffect(() => {
    if (step === "fields") {
      return;
    }
    document.getElementById("auth-screen-heading")?.focus();
  }, [step]);

  const completeIfReady = React.useCallback(
    async (
      status: string | null | undefined,
      sessionId: string | null | undefined,
    ) => {
      if (status === "complete" && sessionId) {
        await setActive({ session: sessionId, redirectUrl: completeUrl });
        router.replace(completeUrl);
        return true;
      }
      return false;
    },
    [completeUrl, router, setActive],
  );

  const prepareFrom = React.useCallback(
    async (current: SignUpLike) => {
      if (await completeIfReady(current.status, current.createdSessionId)) {
        return;
      }
      const unverified = current.unverifiedFields ?? [];
      if (unverified.includes("email_address")) {
        await signUp?.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        setCode("");
        setStartedAt(Date.now());
        setStep("verify-email");
        return;
      }
      if (unverified.includes("phone_number")) {
        await signUp?.preparePhoneNumberVerification({
          strategy: "phone_code",
        });
        setCode("");
        setStartedAt(Date.now());
        setStep("verify-phone");
      }
    },
    [completeIfReady, signUp],
  );

  const autoPreparedKey = signUp
    ? `${signUp.id ?? "none"}:${signUp.status ?? "none"}:${(signUp.missingFields ?? []).join(",")}:${(signUp.unverifiedFields ?? []).join(",")}`
    : "unloaded";
  const autoPreparedFor = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!isLoaded || !signUp || pending) {
      return;
    }
    if (autoPreparedFor.current === autoPreparedKey) {
      return;
    }
    if (signUp.status === "complete") {
      autoPreparedFor.current = autoPreparedKey;
      void completeIfReady(signUp.status, signUp.createdSessionId);
      return;
    }
    if (
      step === "fields" &&
      (signUp.missingFields?.length ?? 0) === 0 &&
      (signUp.unverifiedFields?.length ?? 0) > 0
    ) {
      autoPreparedFor.current = autoPreparedKey;
      void prepareFrom(signUp);
    }
  }, [
    autoPreparedKey,
    completeIfReady,
    isLoaded,
    pending,
    prepareFrom,
    signUp,
    step,
  ]);

  async function onSubmitFields(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !signUp) {
      return;
    }
    let phoneE164: string | undefined;
    if (isMissing(signUp, "phone_number")) {
      const assembled = assembleE164(countryIso, national);
      if (!assembled.ok) {
        const next: SplitFormError = {
          fieldErrors: {
            phoneNumber:
              CLERK_AUTH_ERROR_COPY.form_param_format_invalid ??
              "That doesn't look right. Check the format and try again.",
          },
          globalMessage: null,
        };
        setSplit(next);
        focusSplit(next, summaryRef.current);
        return;
      }
      phoneE164 = assembled.e164;
    }
    setPending(true);
    setSplit(null);
    try {
      const payload: {
        username?: string;
        emailAddress?: string;
        phoneNumber?: string;
        password?: string;
        firstName?: string;
        lastName?: string;
      } = {};
      if (isMissing(signUp, "username")) {
        payload.username = username.trim();
      }
      if (isMissing(signUp, "email_address")) {
        payload.emailAddress = emailAddress.trim();
      }
      if (phoneE164) {
        payload.phoneNumber = phoneE164;
      }
      if (isMissing(signUp, "password")) {
        payload.password = password;
      }
      if (isMissing(signUp, "first_name")) {
        payload.firstName = firstName.trim();
      }
      if (isMissing(signUp, "last_name")) {
        payload.lastName = lastName.trim();
      }
      const updated = await signUp.update(payload);
      await prepareFrom(updated);
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
        await prepareFrom(result);
        setPending(false);
        return;
      }
      if (step === "verify-phone" && unverified.includes("email_address")) {
        await prepareFrom(result);
        setPending(false);
        return;
      }
      if ((result.missingFields?.length ?? 0) > 0) {
        setStep("fields");
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

  if (!isLoaded) {
    return (
      <AuthScreen title="Almost there">
        <p className="text-body text-muted-foreground">Loading…</p>
      </AuthScreen>
    );
  }

  if (signUp?.status == null) {
    return (
      <AuthScreen
        backHref={signUpUrl}
        backLabel="Back"
        crossLink={{ href: signInUrl, label: "Sign in" }}
        title="Almost there"
        description="Finish creating your account, or start from the beginning."
      >
        <div className="flex flex-col gap-[18px]">
          <p className="text-body text-muted-foreground">
            Start from{" "}
            <Link className="text-ink font-medium underline" href={signUpUrl}>
              sign up
            </Link>{" "}
            or continue with Google.
          </p>
          <OauthButtons flow="sign-up" redirectUrl={redirectUrl} />
        </div>
      </AuthScreen>
    );
  }

  const verifying = step !== "fields";
  const usernameError = split?.fieldErrors.username;
  const emailError =
    split?.fieldErrors.email_address ?? split?.fieldErrors.emailAddress;
  const phoneError =
    split?.fieldErrors.phone_number ?? split?.fieldErrors.phoneNumber;
  const passwordError = split?.fieldErrors.password;
  const firstNameError =
    split?.fieldErrors.first_name ?? split?.fieldErrors.firstName;
  const lastNameError =
    split?.fieldErrors.last_name ?? split?.fieldErrors.lastName;
  const codeError = split?.fieldErrors.code;
  const destination =
    step === "verify-email"
      ? emailAddress.length > 0
        ? emailAddress
        : (signUp.emailAddress ?? "your email")
      : national.length > 0
        ? formatInternationalNumber(countryIso, national)
        : (signUp.phoneNumber ?? "your number");

  if (verifying) {
    return (
      <AuthScreen
        onBack={() => {
          setStep("fields");
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
          destination={destination}
          changeLabel={
            step === "verify-email" ? "Change email" : "Change number"
          }
          onChangeIdentifier={() => {
            setStep("fields");
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
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      backHref={signUpUrl}
      backLabel="Back"
      crossLink={{ href: signInUrl, label: "Sign in" }}
      title="Almost there"
      description="A few details are still needed to finish your account."
      footer={
        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link
            className="text-foreground font-medium underline-offset-4 hover:underline"
            href={signInUrl}
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form
        className="flex flex-col gap-[18px]"
        onSubmit={onSubmitFields}
        noValidate
      >
        <FormErrorSummary ref={summaryRef} message={split?.globalMessage} />
        <div id="clerk-captcha" />
        <FieldGroup className="gap-[18px]">
          {isMissing(signUp, "first_name") ? (
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
                className={cn(AUTH_INPUT_CLASS)}
                disabled={pending}
              />
              {firstNameError ? (
                <FieldError>{firstNameError}</FieldError>
              ) : null}
            </Field>
          ) : null}
          {isMissing(signUp, "last_name") ? (
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
                className={cn(AUTH_INPUT_CLASS)}
                disabled={pending}
              />
              {lastNameError ? <FieldError>{lastNameError}</FieldError> : null}
            </Field>
          ) : null}
          {isMissing(signUp, "username") ? (
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
                autoComplete="username"
                placeholder="Choose a username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                aria-invalid={Boolean(usernameError)}
                className={cn(AUTH_INPUT_CLASS)}
                disabled={pending}
              />
              {usernameError ? <FieldError>{usernameError}</FieldError> : null}
            </Field>
          ) : null}
          {isMissing(signUp, "email_address") ? (
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
                className={cn(AUTH_INPUT_CLASS)}
                disabled={pending}
              />
              {emailError ? <FieldError>{emailError}</FieldError> : null}
            </Field>
          ) : null}
          {isMissing(signUp, "phone_number") ? (
            <Field>
              <FieldLabel
                htmlFor={FIELD_IDS.phoneNumber}
                className="text-meta text-muted-foreground"
              >
                Mobile number
              </FieldLabel>
              <PhoneField
                id={FIELD_IDS.phoneNumber}
                name="phone"
                countryIso={countryIso}
                national={national}
                onCountryIsoChange={setCountryIso}
                onNationalChange={setNational}
                invalid={Boolean(phoneError)}
                describedBy={
                  phoneError ? `${FIELD_IDS.phoneNumber}-error` : undefined
                }
                disabled={pending}
              />
              {phoneError ? (
                <FieldError id={`${FIELD_IDS.phoneNumber}-error`}>
                  {phoneError}
                </FieldError>
              ) : null}
            </Field>
          ) : null}
          {isMissing(signUp, "password") ? (
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
                placeholder="Create a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(passwordError)}
                className={cn(AUTH_INPUT_CLASS)}
                disabled={pending}
              />
              {passwordError ? <FieldError>{passwordError}</FieldError> : null}
            </Field>
          ) : null}
        </FieldGroup>
        <Button
          type="submit"
          size="auth"
          aria-busy={pending}
          disabled={pending}
          className="bg-ink text-paper hover:bg-dimrule w-full font-semibold"
        >
          Continue
        </Button>
      </form>
    </AuthScreen>
  );
}
