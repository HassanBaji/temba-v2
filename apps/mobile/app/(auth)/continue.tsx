import { useSignUp } from "@clerk/expo/legacy";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import {
  DEFAULT_CALLING_COUNTRY_ISO,
  formatInternationalNumber,
} from "@repo/domain/phone-number";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { AuthLoading } from "../../src/auth/auth-loading";
import { AuthScreen } from "../../src/auth/auth-screen";
import {
  somethingWentWrong,
  buildContinuePayload,
  fieldError,
  nextSignUpStep,
  type SignUpNextStep,
} from "../../src/auth/clerk-forms";
import { CodeForm } from "../../src/auth/code-form";
import { FormErrorSummary } from "../../src/auth/form-error-summary";
import { PhoneField } from "../../src/auth/phone-field";
import {
  FRESH_ACCOUNT_TARGET,
  setPostAuthTarget,
} from "../../src/auth/post-auth-target";
import { useLocale, useMessages } from "../../src/i18n/locale-provider";
import { type SplitFormError } from "../../src/lib/form-error";
import { Button } from "../../src/primitives/button";
import { Text } from "../../src/primitives/text";
import { TextField } from "../../src/primitives/text-field";

type Step = "fields" | "verify-email" | "verify-phone";

function backToWelcome() {
  router.replace("/welcome");
}

export default function Continue() {
  const m = useMessages();
  const locale = useLocale();
  const { signUp, setActive, isLoaded } = useSignUp();
  const [step, setStep] = useState<Step>("fields");
  const [emailAddress, setEmailAddress] = useState("");
  const [countryIso, setCountryIso] = useState(DEFAULT_CALLING_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [code, setCode] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const [split, setSplit] = useState<SplitFormError | null>(null);

  const missing: string[] = signUp?.missingFields ?? [];
  const isMissing = (field: string) => missing.includes(field);

  async function advance(next: SignUpNextStep) {
    if (!signUp) {
      return;
    }
    if (next.kind === "complete") {
      setPostAuthTarget(FRESH_ACCOUNT_TARGET);
      await setActive({ session: next.sessionId });
      return;
    }
    if (next.kind === "verify-email") {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } else if (next.kind === "verify-phone") {
      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
    } else {
      setStep("fields");
      if (next.kind === "stuck") {
        setSplit(somethingWentWrong(locale));
      }
      return;
    }
    setCode("");
    setStartedAt(Date.now());
    setStep(next.kind);
  }

  async function onSubmitFields() {
    if (pending || !signUp) {
      return;
    }
    const built = buildContinuePayload(
      missing,
      {
        emailAddress,
        password,
        firstName,
        lastName,
        countryIso,
        national,
      },
      locale,
    );
    if (!built.ok) {
      setSplit(built.split);
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const updated = await signUp.update(built.payload);
      await advance(nextSignUpStep(updated));
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
    } finally {
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
      await advance(nextSignUpStep(result));
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
    } finally {
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
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
    } finally {
      setPending(false);
    }
  }

  const autoAdvanced = useRef(false);
  useEffect(() => {
    if (!isLoaded || !signUp || autoAdvanced.current) {
      return;
    }
    autoAdvanced.current = true;
    const next = nextSignUpStep(signUp);
    if (next.kind === "fields" || next.kind === "stuck") {
      return;
    }
    setPending(true);
    advance(next)
      .catch((err: unknown) => setSplit(splitClerkAuthError(err, locale)))
      .finally(() => setPending(false));
  });

  if (!isLoaded) {
    return <AuthLoading />;
  }

  if (signUp?.status == null) {
    return (
      <AuthScreen
        onBack={backToWelcome}
        title={m.mobileHome.continue.almostThere}
        description={m.mobileHome.continue.startOver}
      >
        <Button
          label={m.mobileHome.welcome.continueWithPhone}
          size="lg"
          onPress={() => router.replace("/sign-in")}
        />
      </AuthScreen>
    );
  }

  if (step !== "fields") {
    const email = step === "verify-email";
    return (
      <AuthScreen
        onBack={() => {
          setStep("fields");
          setSplit(null);
          setCode("");
        }}
        title={m.mobileHome.code.enterTheCode}
        footer={
          <Text size="eyebrow" tone="muted">
            {email
              ? m.mobileHome.code.expiryEmail
              : m.mobileHome.code.expiryNumber}
          </Text>
        }
      >
        <CodeForm
          destination={
            email
              ? emailAddress ||
                (signUp.emailAddress ?? m.mobileHome.code.yourEmail)
              : national
                ? formatInternationalNumber(countryIso, national)
                : (signUp.phoneNumber ?? m.mobileHome.code.yourNumber)
          }
          changeLabel={
            email
              ? m.mobileHome.code.changeEmail
              : m.mobileHome.code.changeNumber
          }
          onChangeIdentifier={() => {
            setStep("fields");
            setSplit(null);
            setCode("");
          }}
          code={code}
          onCodeChange={setCode}
          onVerify={() => void onVerify()}
          onResend={() => void onResend()}
          startedAt={startedAt}
          pending={pending}
          globalMessage={split?.globalMessage ?? null}
          codeError={fieldError(split, "code")}
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      onBack={backToWelcome}
      title={m.mobileHome.continue.almostThere}
      description={m.mobileHome.continue.fewDetails}
    >
      <FormErrorSummary message={split?.globalMessage} />
      {isMissing("first_name") ? (
        <TextField
          label={m.mobileHome.fields.firstName}
          autoComplete="given-name"
          value={firstName}
          onChangeText={setFirstName}
          editable={!pending}
          error={fieldError(split, "first_name", "firstName")}
        />
      ) : null}
      {isMissing("last_name") ? (
        <TextField
          label={m.mobileHome.fields.lastName}
          autoComplete="family-name"
          value={lastName}
          onChangeText={setLastName}
          editable={!pending}
          error={fieldError(split, "last_name", "lastName")}
        />
      ) : null}
      {isMissing("email_address") ? (
        <TextField
          label={m.mobileHome.fields.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          value={emailAddress}
          onChangeText={setEmailAddress}
          editable={!pending}
          error={fieldError(split, "email_address", "emailAddress")}
        />
      ) : null}
      {isMissing("phone_number") ? (
        <PhoneField
          label={m.mobileHome.fields.mobileNumber}
          countryIso={countryIso}
          national={national}
          onCountryIsoChange={setCountryIso}
          onNationalChange={setNational}
          error={fieldError(split, "phone_number", "phoneNumber")}
          disabled={pending}
        />
      ) : null}
      {isMissing("password") ? (
        <TextField
          label={m.mobileHome.fields.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
          placeholder={m.mobileHome.fields.createPassword}
          value={password}
          onChangeText={setPassword}
          editable={!pending}
          error={fieldError(split, "password")}
        />
      ) : null}
      <Button
        label={m.common.continue}
        size="lg"
        pending={pending}
        onPress={() => void onSubmitFields()}
      />
    </AuthScreen>
  );
}
