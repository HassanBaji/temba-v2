import { useSignIn } from "@clerk/expo/legacy";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import { router } from "expo-router";
import { useEffect, useState } from "react";

import { AuthLoading } from "../../src/auth/auth-loading";
import { AuthScreen } from "../../src/auth/auth-screen";
import { SOMETHING_WENT_WRONG, fieldError } from "../../src/auth/clerk-forms";
import { CodeForm } from "../../src/auth/code-form";
import { type SplitFormError } from "../../src/lib/form-error";
import { Button } from "../../src/primitives/button";
import { Text } from "../../src/primitives/text";

function backToSignIn() {
  router.replace("/sign-in");
}

export default function FactorTwo() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [code, setCode] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [split, setSplit] = useState<SplitFormError | null>(null);

  useEffect(() => {
    if (
      !isLoaded ||
      !signIn ||
      prepared ||
      pending ||
      signIn.status !== "needs_second_factor"
    ) {
      return;
    }
    setPending(true);
    void signIn
      .prepareSecondFactor({ strategy: "phone_code" })
      .then(() => setStartedAt(Date.now()))
      .catch((err: unknown) => setSplit(splitClerkAuthError(err)))
      .finally(() => {
        setPrepared(true);
        setPending(false);
      });
  }, [isLoaded, pending, prepared, signIn]);

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
        await setActive({ session: result.createdSessionId });
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
      await signIn.prepareSecondFactor({ strategy: "phone_code" });
      setStartedAt(Date.now());
    } catch (err) {
      setSplit(splitClerkAuthError(err));
    } finally {
      setPending(false);
    }
  }

  if (!isLoaded) {
    return <AuthLoading />;
  }

  if (signIn?.status !== "needs_second_factor") {
    return (
      <AuthScreen
        onBack={backToSignIn}
        title="Check your phone"
        description="Start from sign in to continue."
      >
        <Button label="Sign in" size="lg" onPress={backToSignIn} />
      </AuthScreen>
    );
  }

  const phone =
    signIn.supportedSecondFactors?.find(
      (factor) => factor.strategy === "phone_code",
    )?.safeIdentifier ?? "your number";

  return (
    <AuthScreen
      onBack={backToSignIn}
      title="Enter the code"
      footer={
        <Text size="eyebrow" tone="muted">
          Codes expire after a short time. Too many wrong tries will lock this
          account.
        </Text>
      }
    >
      <CodeForm
        destination={phone}
        changeLabel="Sign in with a different account"
        onChangeIdentifier={backToSignIn}
        code={code}
        onCodeChange={setCode}
        onVerify={() => void onVerify()}
        onResend={() => void onResend()}
        startedAt={startedAt}
        pending={pending || !prepared}
        globalMessage={split?.globalMessage ?? null}
        codeError={fieldError(split, "code")}
      />
    </AuthScreen>
  );
}
