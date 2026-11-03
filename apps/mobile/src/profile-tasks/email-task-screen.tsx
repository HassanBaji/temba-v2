import { useUser } from "@clerk/expo";
import { colors, sizes } from "@repo/design-tokens";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import { KeyRound, Lock, Receipt } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AuthScreen } from "../auth/auth-screen";
import { somethingWentWrong, fieldError } from "../auth/clerk-forms";
import { CodeForm } from "../auth/code-form";
import { FormErrorSummary } from "../auth/form-error-summary";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { type SplitFormError } from "../lib/form-error";
import { Button } from "../primitives/button";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { backToChecklist } from "./task-navigation";

type Step = "email" | "code";

const BENEFIT_ICONS = {
  receipts: Receipt,
  recovery: KeyRound,
  private: Lock,
} as const;

function NotNow({ disabled }: { disabled: boolean }) {
  const m = useMessages();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      disabled={disabled}
      onPress={backToChecklist}
      style={{ minHeight: 44, justifyContent: "center" }}
    >
      <Text
        tone="muted"
        style={{ textAlign: "center", textDecorationLine: "underline" }}
      >
        {m.mobileHome.tasks.notNow}
      </Text>
    </Pressable>
  );
}

export function EmailTaskScreen() {
  const m = useMessages();
  const locale = useLocale();
  const { user } = useUser();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(() => {
    const unverified = user?.emailAddresses.find(
      (item) => item.verification.status !== "verified",
    );
    return unverified?.emailAddress ?? "";
  });
  const [addressId, setAddressId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const [split, setSplit] = useState<SplitFormError | null>(null);

  function addressById(id: string | null) {
    return user?.emailAddresses.find((item) => item.id === id) ?? null;
  }

  async function onSendCode() {
    if (pending || !user) {
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      setSplit({
        fieldErrors: { email_address: m.mobileHome.emailTask.enterEmail },
        globalMessage: null,
      });
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const existing = user.emailAddresses.find(
        (item) => item.emailAddress.toLowerCase() === trimmed.toLowerCase(),
      );
      const address =
        existing ?? (await user.createEmailAddress({ email: trimmed }));
      await address.prepareVerification({ strategy: "email_code" });
      setAddressId(address.id);
      setCode("");
      setStartedAt(Date.now());
      setStep("code");
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
    } finally {
      setPending(false);
    }
  }

  async function onResend() {
    const address = addressById(addressId);
    if (pending || !address) {
      return;
    }
    setPending(true);
    try {
      await address.prepareVerification({ strategy: "email_code" });
      setStartedAt(Date.now());
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
    } finally {
      setPending(false);
    }
  }

  async function onVerify() {
    const address = addressById(addressId);
    if (pending || !user || !address) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const verified = await address.attemptVerification({ code });
      if (verified.verification.status !== "verified") {
        setSplit(somethingWentWrong(locale));
        return;
      }
      await user.update({ primaryEmailAddressId: verified.id });
      await user.reload();
      backToChecklist();
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
    } finally {
      setPending(false);
    }
  }

  if (step === "code") {
    return (
      <AuthScreen
        onBack={() => {
          setStep("email");
          setSplit(null);
          setCode("");
        }}
        meta={m.mobileHome.emailTask.meta}
        title={m.mobileHome.emailTask.checkInbox}
        footer={
          <Text size="eyebrow" tone="muted">
            {m.mobileHome.emailTask.inboxFooter}
          </Text>
        }
      >
        <CodeForm
          destination={email.trim()}
          changeLabel={m.mobileHome.code.changeEmail}
          onChangeIdentifier={() => {
            setStep("email");
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

  const benefits = m.mobileHome.emailTask.benefits;

  return (
    <AuthScreen
      onBack={backToChecklist}
      meta={m.mobileHome.emailTask.meta}
      title={m.mobileHome.emailTask.title}
      description={m.mobileHome.emailTask.description}
      action={
        <>
          <Button
            label={m.mobileHome.emailTask.sendCode}
            size="lg"
            pending={pending}
            disabled={!user}
            onPress={() => void onSendCode()}
          />
          <NotNow disabled={pending} />
        </>
      }
    >
      <FormErrorSummary message={split?.globalMessage} />
      <TextField
        label={m.mobileHome.fields.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        autoFocus
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={() => void onSendCode()}
        editable={!pending}
        error={fieldError(split, "email_address", "emailAddress")}
      />
      <View style={{ gap: 14 }}>
        {(Object.keys(BENEFIT_ICONS) as (keyof typeof BENEFIT_ICONS)[]).map(
          (key) => {
            const Icon = BENEFIT_ICONS[key];
            return (
              <View
                key={key}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <Icon size={sizes.iconAction} color={colors.ink} />
                <Text size="meta" tone="muted" style={{ flex: 1 }}>
                  <Text size="meta" weight="semibold">
                    {benefits[key].lead}
                  </Text>{" "}
                  {benefits[key].text}
                </Text>
              </View>
            );
          },
        )}
      </View>
    </AuthScreen>
  );
}
