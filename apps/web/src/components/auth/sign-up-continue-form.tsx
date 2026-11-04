"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignUp } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthLoading } from "~/components/auth/auth-loading";
import { AuthScreen } from "~/components/auth/auth-screen";
import { SlotText } from "~/components/auth/auth-terms-note";
import { OauthButtons } from "~/components/auth/oauth-buttons";
import { PasswordField } from "~/components/auth/password-field";
import { PhoneField } from "~/components/auth/phone-field";
import { VerifyCodeForm } from "~/components/auth/verify-code-form";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import { authCrossLinkUrl, signUpCompleteUrl } from "~/lib/auth-redirect";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import type { SplitFormError } from "~/lib/form-mutation-error";
import {
  DEFAULT_CALLING_COUNTRY_ISO,
  assembleE164,
  formatInternationalNumber,
} from "@repo/domain/phone-number";
import { PASSWORD_MIN_LENGTH } from "~/lib/password-strength";

const FIELD_IDS = {
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
  const m = useMessages();
  const locale = useLocale();
  const { setActive } = useClerk();
  const { signUp, isLoaded } = useSignUp();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const completeUrl = signUpCompleteUrl(redirectUrl);
  const signInUrl = authCrossLinkUrl("/login", redirectUrl);

  const [step, setStep] = React.useState<Step>("fields");
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

  // After render, so the input is enabled again and the summary is mounted.
  React.useEffect(() => {
    if (split) {
      focusSplit(split, summaryRef.current);
    }
  }, [split]);

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
            phoneNumber: m.auth.clerkError.paramFormatInvalid,
          },
          globalMessage: null,
        };
        setSplit(next);
        return;
      }
      phoneE164 = assembled.e164;
    }
    setPending(true);
    setSplit(null);
    try {
      const payload: {
        emailAddress?: string;
        phoneNumber?: string;
        password?: string;
        firstName?: string;
        lastName?: string;
      } = {};
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
      const next = splitClerkAuthError(err, locale);
      setSplit(next);
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
        globalMessage: m.auth.clerkError.generic,
      });
    } catch (err) {
      const next = splitClerkAuthError(err, locale);
      setSplit(next);
      setPending(false);
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
      const next = splitClerkAuthError(err, locale);
      setSplit(next);
      setPending(false);
    }
  }

  if (!isLoaded) {
    return (
      <AuthScreen title={m.webAuth.signUpContinue.almostThere}>
        <AuthLoading />
      </AuthScreen>
    );
  }

  if (signUp?.status == null) {
    return (
      <AuthScreen
        backHref={signInUrl}
        title={m.webAuth.signUpContinue.almostThere}
        description={m.webAuth.signUpContinue.finishOrStart}
      >
        <div className="flex flex-col gap-[18px]">
          <p className="text-body text-muted-foreground">
            <SlotText
              text={m.webAuth.signUpContinue.startFrom}
              slots={{
                phone: (
                  <Link
                    className="text-ink font-medium underline"
                    href={signInUrl}
                  >
                    {m.webAuth.signUpContinue.yourPhoneNumber}
                  </Link>
                ),
              }}
            />
          </p>
          <OauthButtons flow="sign-up" redirectUrl={redirectUrl} />
        </div>
      </AuthScreen>
    );
  }

  const verifying = step !== "fields";
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
        : (signUp.emailAddress ?? m.webAuth.signUpContinue.yourEmail)
      : national.length > 0
        ? formatInternationalNumber(countryIso, national)
        : (signUp.phoneNumber ?? m.webAuth.signUpContinue.yourNumber);

  if (verifying) {
    return (
      <AuthScreen
        onBack={() => {
          setStep("fields");
          setSplit(null);
          setCode("");
        }}
        title={m.webAuth.signUpContinue.enterTheCode}
        footer={
          <p className="text-eyebrow text-muted-foreground leading-[1.5]">
            {step === "verify-email"
              ? m.webAuth.phoneAuth.codesExpire.email
              : m.webAuth.phoneAuth.codesExpire.number}
          </p>
        }
      >
        <VerifyCodeForm
          destination={destination}
          changeLabel={
            step === "verify-email"
              ? m.webAuth.signUpContinue.changeEmail
              : m.webAuth.phoneAuth.changeNumber
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
      backHref={signInUrl}
      title={m.webAuth.signUpContinue.almostThere}
      description={m.webAuth.signUpContinue.detailsNeeded}
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
                {m.webAuth.phoneAuth.firstName}
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
          ) : null}
          {isMissing(signUp, "last_name") ? (
            <Field>
              <FieldLabel
                htmlFor={FIELD_IDS.lastName}
                className="text-meta text-muted-foreground"
              >
                {m.webAuth.phoneAuth.lastName}
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
          ) : null}
          {isMissing(signUp, "email_address") ? (
            <Field>
              <FieldLabel
                htmlFor={FIELD_IDS.emailAddress}
                className="text-meta text-muted-foreground"
              >
                {m.webAuth.signUpContinue.email}
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
                size="lg"
                disabled={pending}
              />
              {emailError ? (
                <FieldError id={`${FIELD_IDS.emailAddress}-error`}>
                  {emailError}
                </FieldError>
              ) : null}
            </Field>
          ) : null}
          {isMissing(signUp, "phone_number") ? (
            <Field>
              <FieldLabel
                htmlFor={FIELD_IDS.phoneNumber}
                className="text-meta text-muted-foreground"
              >
                {m.webAuth.phoneAuth.mobileNumber}
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
                {m.webAuth.phoneAuth.passwordLabel}
              </FieldLabel>
              <PasswordField
                id={FIELD_IDS.password}
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                placeholder={m.webAuth.password.placeholder(
                  PASSWORD_MIN_LENGTH,
                )}
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
          ) : null}
        </FieldGroup>
        <Button
          type="submit"
          size="lg"
          pending={pending}
          pendingLabel={m.webAuth.signUpContinue.continuing}
          className="w-full font-semibold"
        >
          {m.common.continue}
        </Button>
      </form>
    </AuthScreen>
  );
}
