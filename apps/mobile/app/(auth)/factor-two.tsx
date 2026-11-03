import { useSignIn } from "@clerk/expo/legacy";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import { router } from "expo-router";
import { useEffect, useState } from "react";

import { AuthLoading } from "../../src/auth/auth-loading";
import { AuthScreen } from "../../src/auth/auth-screen";
import { somethingWentWrong, fieldError } from "../../src/auth/clerk-forms";
import { CodeForm } from "../../src/auth/code-form";
import { useLocale, useMessages } from "../../src/i18n/locale-provider";
import { type SplitFormError } from "../../src/lib/form-error";
import { Button } from "../../src/primitives/button";
import { Text } from "../../src/primitives/text";

function backToSignIn() {
  router.replace("/sign-in");
}

export default function FactorTwo() {
  const m = useMessages();
  const locale = useLocale();
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
      .catch((err: unknown) => setSplit(splitClerkAuthError(err, locale)))
      .finally(() => {
        setPrepared(true);
        setPending(false);
      });
  }, [isLoaded, locale, pending, prepared, signIn]);

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
      setSplit(somethingWentWrong(locale));
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
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
      setSplit(splitClerkAuthError(err, locale));
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
        title={m.mobileHome.factorTwo.checkYourPhone}
        description={m.mobileHome.factorTwo.startFromSignIn}
      >
        <Button label={m.common.signIn} size="lg" onPress={backToSignIn} />
      </AuthScreen>
    );
  }

  const phone =
    signIn.supportedSecondFactors?.find(
      (factor) => factor.strategy === "phone_code",
    )?.safeIdentifier ?? m.mobileHome.code.yourNumber;

  return (
    <AuthScreen
      onBack={backToSignIn}
      title={m.mobileHome.code.enterTheCode}
      footer={
        <Text size="eyebrow" tone="muted">
          {m.mobileHome.code.expiryAccount}
        </Text>
      }
    >
      <CodeForm
        destination={phone}
        changeLabel={m.mobileHome.factorTwo.differentAccount}
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
