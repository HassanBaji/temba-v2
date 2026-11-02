import { useUser } from "@clerk/expo";
import { colors, sizes } from "@repo/design-tokens";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import { KeyRound, Lock, Receipt } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AuthScreen } from "../auth/auth-screen";
import { SOMETHING_WENT_WRONG, fieldError } from "../auth/clerk-forms";
import { CodeForm } from "../auth/code-form";
import { FormErrorSummary } from "../auth/form-error-summary";
import { type SplitFormError } from "../lib/form-error";
import { Button } from "../primitives/button";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { backToChecklist } from "./task-navigation";

type Step = "email" | "code";

const BENEFITS = [
  {
    icon: Receipt,
    lead: "Receipts.",
    text: "Every booking and seat payment, in your inbox.",
  },
  {
    icon: KeyRound,
    lead: "Recovery.",
    text: "Sign in by email if your number changes.",
  },
  { icon: Lock, lead: "Private.", text: "Never shown to other members." },
];

function NotNow({ disabled }: { disabled: boolean }) {
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
        Not now
      </Text>
    </Pressable>
  );
}

export function EmailTaskScreen() {
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
        fieldErrors: { email_address: "Enter your email" },
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
      setSplit(splitClerkAuthError(err));
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
      setSplit(splitClerkAuthError(err));
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
        setSplit(SOMETHING_WENT_WRONG);
        return;
      }
      await user.update({ primaryEmailAddressId: verified.id });
      await user.reload();
      backToChecklist();
    } catch (err) {
      setSplit(splitClerkAuthError(err));
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
        meta="Profile / Email"
        title="Check your inbox"
        footer={
          <Text size="eyebrow" tone="muted">
            Until verified, the email is saved but unused. Check spam if nothing
            arrives in a minute.
          </Text>
        }
      >
        <CodeForm
          destination={email.trim()}
          changeLabel="Change email"
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

  return (
    <AuthScreen
      onBack={backToChecklist}
      meta="Profile / Email"
      title="Add your email"
      description="For booking receipts, and a way back into your account if you change number. We send a six digit code to confirm it."
      action={
        <>
          <Button
            label="Send code"
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
        label="Email"
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
        {BENEFITS.map(({ icon: Icon, lead, text }) => (
          <View
            key={lead}
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
          >
            <Icon size={sizes.iconAction} color={colors.ink} />
            <Text size="meta" tone="muted" style={{ flex: 1 }}>
              <Text size="meta" weight="semibold">
                {lead}
              </Text>{" "}
              {text}
            </Text>
          </View>
        ))}
      </View>
    </AuthScreen>
  );
}
