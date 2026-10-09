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
  SOMETHING_WENT_WRONG,
  buildContinuePayload,
  fieldError,
  nextSignUpStep,
  type SignUpNextStep,
} from "../../src/auth/clerk-forms";
import { CodeForm } from "../../src/auth/code-form";
import { FormErrorSummary } from "../../src/auth/form-error-summary";
import { PhoneField } from "../../src/auth/phone-field";
import { type SplitFormError } from "../../src/lib/form-error";
import { Button } from "../../src/primitives/button";
import { Text } from "../../src/primitives/text";
import { TextField } from "../../src/primitives/text-field";

type Step = "fields" | "verify-email" | "verify-phone";

function backToWelcome() {
  router.replace("/welcome");
}

export default function Continue() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [step, setStep] = useState<Step>("fields");
  const [username, setUsername] = useState("");
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
        setSplit(SOMETHING_WENT_WRONG);
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
    const built = buildContinuePayload(missing, {
      username,
      emailAddress,
      password,
      firstName,
      lastName,
      countryIso,
      national,
    });
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
      setSplit(splitClerkAuthError(err));
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
      setSplit(splitClerkAuthError(err));
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
      setSplit(splitClerkAuthError(err));
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
      .catch((err: unknown) => setSplit(splitClerkAuthError(err)))
      .finally(() => setPending(false));
  });

  if (!isLoaded) {
    return <AuthLoading />;
  }

  if (signUp?.status == null) {
    return (
      <AuthScreen
        onBack={backToWelcome}
        title="Almost there"
        description="Finish creating your account, or start from the beginning."
      >
        <Button
          label="Create account"
          size="lg"
          onPress={() => router.replace("/sign-up")}
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
        title="Enter the code"
        footer={
          <Text size="eyebrow" tone="muted">
            Codes expire after a short time. Too many wrong tries will lock this{" "}
            {email ? "email" : "number"}.
          </Text>
        }
      >
        <CodeForm
          destination={
            email
              ? emailAddress || (signUp.emailAddress ?? "your email")
              : national
                ? formatInternationalNumber(countryIso, national)
                : (signUp.phoneNumber ?? "your number")
          }
          changeLabel={email ? "Change email" : "Change number"}
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
      title="Almost there"
      description="A few details are still needed to finish your account."
    >
      <FormErrorSummary message={split?.globalMessage} />
      {isMissing("first_name") ? (
        <TextField
          label="First name"
          autoComplete="given-name"
          value={firstName}
          onChangeText={setFirstName}
          editable={!pending}
          error={fieldError(split, "first_name", "firstName")}
        />
      ) : null}
      {isMissing("last_name") ? (
        <TextField
          label="Last name"
          autoComplete="family-name"
          value={lastName}
          onChangeText={setLastName}
          editable={!pending}
          error={fieldError(split, "last_name", "lastName")}
        />
      ) : null}
      {isMissing("username") ? (
        <TextField
          label="Username"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          placeholder="Choose a username"
          value={username}
          onChangeText={setUsername}
          editable={!pending}
          error={fieldError(split, "username")}
        />
      ) : null}
      {isMissing("email_address") ? (
        <TextField
          label="Email"
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
          label="Mobile number"
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
          label="Password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
          placeholder="Create a password"
          value={password}
          onChangeText={setPassword}
          editable={!pending}
          error={fieldError(split, "password")}
        />
      ) : null}
      <Button
        label="Continue"
        size="lg"
        pending={pending}
        onPress={() => void onSubmitFields()}
      />
    </AuthScreen>
  );
}
