import { useSignUp } from "@clerk/expo/legacy";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import {
  DEFAULT_CALLING_COUNTRY_ISO,
  formatInternationalNumber,
} from "@repo/domain/phone-number";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { AuthScreen, goBackOrWelcome } from "../../src/auth/auth-screen";
import {
  SOMETHING_WENT_WRONG,
  fieldError,
  nextSignUpStep,
  resolvePhone,
} from "../../src/auth/clerk-forms";
import { CodeForm } from "../../src/auth/code-form";
import { FormErrorSummary } from "../../src/auth/form-error-summary";
import { OauthButtons } from "../../src/auth/oauth-buttons";
import { PhoneField } from "../../src/auth/phone-field";
import { type SplitFormError } from "../../src/lib/form-error";
import { Button } from "../../src/primitives/button";
import { Text } from "../../src/primitives/text";
import { TextField } from "../../src/primitives/text-field";

type Step = "details" | "verify-phone";

export default function SignUp() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [step, setStep] = useState<Step>("details");
  const [username, setUsername] = useState("");
  const [countryIso, setCountryIso] = useState(DEFAULT_CALLING_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const [split, setSplit] = useState<SplitFormError | null>(null);
  const verifying = step === "verify-phone";

  function backToDetails() {
    setStep("details");
    setSplit(null);
    setCode("");
  }

  async function activateIfComplete(
    progress: Parameters<typeof nextSignUpStep>[0],
  ) {
    const next = nextSignUpStep(progress);
    if (next.kind === "complete" && setActive) {
      await setActive({ session: next.sessionId });
      return true;
    }
    return false;
  }

  async function onCreate() {
    if (pending || !signUp) {
      return;
    }
    const phone = resolvePhone(countryIso, national, "phoneNumber");
    if (!phone.ok) {
      setSplit(phone.split);
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const created = await signUp.create({
        username,
        phoneNumber: phone.e164,
        password,
      });
      if (await activateIfComplete(created)) {
        return;
      }
      if (nextSignUpStep(created).kind === "verify-phone") {
        await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
        setCode("");
        setStartedAt(Date.now());
        setStep("verify-phone");
        return;
      }
      setSplit(SOMETHING_WENT_WRONG);
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
      const result = await signUp.attemptPhoneNumberVerification({ code });
      if (!(await activateIfComplete(result))) {
        setSplit(SOMETHING_WENT_WRONG);
      }
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
      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
      setStartedAt(Date.now());
    } catch (err) {
      setSplit(splitClerkAuthError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen
      onBack={verifying ? backToDetails : goBackOrWelcome}
      crossLink={
        verifying
          ? undefined
          : { label: "Sign in", onPress: () => router.replace("/sign-in") }
      }
      title={verifying ? "Enter the code" : "Create account"}
      description={
        verifying
          ? undefined
          : "We send a six digit code to confirm your number."
      }
      footer={
        <Text size="eyebrow" tone="muted">
          {verifying
            ? "Codes expire after a short time. Too many wrong tries will lock this number."
            : "By creating an account you agree to the Terms and Privacy Policy."}
        </Text>
      }
    >
      {verifying ? (
        <CodeForm
          destination={formatInternationalNumber(countryIso, national)}
          changeLabel="Change number"
          onChangeIdentifier={backToDetails}
          code={code}
          onCodeChange={setCode}
          onVerify={() => void onVerify()}
          onResend={() => void onResend()}
          startedAt={startedAt}
          pending={pending}
          globalMessage={split?.globalMessage ?? null}
          codeError={fieldError(split, "code")}
        />
      ) : (
        <>
          <FormErrorSummary message={split?.globalMessage} />
          <View style={{ gap: 18 }}>
            <TextField
              label="Username"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              textContentType="username"
              placeholder="Choose a username"
              value={username}
              onChangeText={setUsername}
              editable={!pending}
              error={fieldError(split, "username")}
            />
            <PhoneField
              label="Mobile number"
              countryIso={countryIso}
              national={national}
              onCountryIsoChange={setCountryIso}
              onNationalChange={setNational}
              error={fieldError(split, "phone_number", "phoneNumber")}
              disabled={pending}
            />
            <TextField
              label="Password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={() => void onCreate()}
              editable={!pending}
              error={fieldError(split, "password")}
            />
          </View>
          <Button
            label="Send code"
            size="lg"
            pending={pending}
            disabled={!isLoaded}
            onPress={() => void onCreate()}
          />
          <OauthButtons />
        </>
      )}
    </AuthScreen>
  );
}
