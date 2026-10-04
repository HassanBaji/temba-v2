import { useSignIn } from "@clerk/expo/legacy";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import { router } from "expo-router";
import { useState } from "react";

import { AuthScreen, goBackOrWelcome } from "../../src/auth/auth-screen";
import { SOMETHING_WENT_WRONG, fieldError } from "../../src/auth/clerk-forms";
import { CodeForm } from "../../src/auth/code-form";
import { FormErrorSummary } from "../../src/auth/form-error-summary";
import { type SplitFormError } from "../../src/lib/form-error";
import { Button } from "../../src/primitives/button";
import { Text } from "../../src/primitives/text";
import { TextField } from "../../src/primitives/text-field";

type Step = "identifier" | "code" | "password";

export default function ResetPassword() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const [split, setSplit] = useState<SplitFormError | null>(null);

  function backToIdentifier() {
    setStep("identifier");
    setSplit(null);
    setCode("");
  }

  async function finishIfReady(result: {
    status: string | null;
    createdSessionId: string | null;
  }) {
    if (result.status === "complete" && result.createdSessionId && setActive) {
      await setActive({ session: result.createdSessionId });
      return true;
    }
    if (result.status === "needs_second_factor") {
      router.replace("/factor-two");
      return true;
    }
    return false;
  }

  async function onSendCode() {
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
    } catch (err) {
      setSplit(splitClerkAuthError(err));
    } finally {
      setPending(false);
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
      if (await finishIfReady(result)) {
        return;
      }
      if (result.status === "needs_new_password") {
        setPassword("");
        setStep("password");
        return;
      }
      setSplit(SOMETHING_WENT_WRONG);
    } catch (err) {
      setSplit(splitClerkAuthError(err));
    } finally {
      setPending(false);
    }
  }

  async function onResend() {
    if (pending || !signIn) {
      return;
    }
    setPending(true);
    try {
      const factor = signIn.supportedFirstFactors?.find(
        (item) => item.strategy === "reset_password_email_code",
      );
      if (factor && "emailAddressId" in factor && factor.emailAddressId) {
        await signIn.prepareFirstFactor({
          strategy: "reset_password_email_code",
          emailAddressId: factor.emailAddressId,
        });
      } else {
        await signIn.create({
          strategy: "reset_password_email_code",
          identifier,
        });
      }
      setStartedAt(Date.now());
    } catch (err) {
      setSplit(splitClerkAuthError(err));
    } finally {
      setPending(false);
    }
  }

  async function onResetPassword() {
    if (pending || !signIn) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signIn.resetPassword({ password });
      if (!(await finishIfReady(result))) {
        setSplit(SOMETHING_WENT_WRONG);
      }
    } catch (err) {
      setSplit(splitClerkAuthError(err));
    } finally {
      setPending(false);
    }
  }

  if (step === "code") {
    return (
      <AuthScreen
        onBack={backToIdentifier}
        title="Enter the code"
        footer={
          <Text size="eyebrow" tone="muted">
            Codes expire after a short time. Too many wrong tries will lock this
            email.
          </Text>
        }
      >
        <CodeForm
          destination={identifier}
          changeLabel="Change email"
          onChangeIdentifier={backToIdentifier}
          code={code}
          onCodeChange={setCode}
          onVerify={() => void onVerifyCode()}
          onResend={() => void onResend()}
          startedAt={startedAt}
          pending={pending}
          globalMessage={split?.globalMessage ?? null}
          codeError={fieldError(split, "code")}
        />
      </AuthScreen>
    );
  }

  if (step === "password") {
    return (
      <AuthScreen
        onBack={() => router.replace("/sign-in")}
        title="Set a new password"
        description="Code confirmed. Choose a new password to finish signing in."
      >
        <FormErrorSummary message={split?.globalMessage} />
        <TextField
          label="New password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => void onResetPassword()}
          editable={!pending}
          error={fieldError(split, "password")}
        />
        <Button
          label="Save password"
          size="lg"
          pending={pending}
          disabled={!isLoaded}
          onPress={() => void onResetPassword()}
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      onBack={goBackOrWelcome}
      title="Forgot password"
      description="We’ll email a six digit code so you can choose a new password."
    >
      <FormErrorSummary message={split?.globalMessage} />
      <TextField
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        value={identifier}
        onChangeText={setIdentifier}
        onSubmitEditing={() => void onSendCode()}
        editable={!pending}
        error={fieldError(split, "identifier")}
      />
      <Text size="meta" tone="muted">
        Reset works with the email address on your account. If you signed up
        with a mobile number and no email, password reset is not available yet.
      </Text>
      <Button
        label="Send code"
        size="lg"
        pending={pending}
        disabled={!isLoaded}
        onPress={() => void onSendCode()}
      />
    </AuthScreen>
  );
}
