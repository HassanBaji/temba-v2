import {
  formatCountdown,
  isResendAvailable,
  remainingSeconds,
  resendAccessibleName,
} from "@repo/domain/resend-countdown";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { Button } from "../primitives/button";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { isCodeComplete, sanitizeCode } from "./clerk-forms";
import { FormErrorSummary } from "./form-error-summary";

function ResendCountdown(props: {
  startedAt: number;
  onResend: () => void;
  disabled: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [resendFrom, setResendFrom] = useState<number | null>(null);
  const remaining = remainingSeconds(props.startedAt, now);
  const available = isResendAvailable(remaining);
  const codeResent =
    resendFrom !== null && props.startedAt > resendFrom && !available;

  useEffect(() => {
    setNow(Date.now());
    if (remainingSeconds(props.startedAt, Date.now()) <= 0) {
      return undefined;
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [props.startedAt]);

  return (
    <View style={{ gap: 4 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={resendAccessibleName(remaining)}
          accessibilityState={{ disabled: props.disabled || !available }}
          disabled={props.disabled || !available}
          hitSlop={8}
          onPress={() => {
            setResendFrom(props.startedAt);
            props.onResend();
          }}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text
            size="meta"
            weight="medium"
            tone={available ? "default" : "muted"}
            style={{ textDecorationLine: available ? "underline" : "none" }}
          >
            Resend code
          </Text>
        </Pressable>
        <Text weight="bold" accessibilityElementsHidden>
          {formatCountdown(remaining)}
        </Text>
      </View>
      {codeResent ? (
        <Text size="meta" tone="muted" accessibilityLiveRegion="polite">
          New code sent
        </Text>
      ) : null}
    </View>
  );
}

export type CodeFormProps = {
  destination: string;
  changeLabel: string;
  onChangeIdentifier: () => void;
  code: string;
  onCodeChange: (value: string) => void;
  onVerify: () => void;
  onResend: () => void;
  startedAt: number;
  pending: boolean;
  globalMessage: string | null;
  codeError?: string;
};

export function CodeForm(props: CodeFormProps) {
  const ready = isCodeComplete(props.code);

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 4 }}>
        <Text tone="muted">Sent to {props.destination}.</Text>
        <Pressable
          accessibilityRole="link"
          hitSlop={8}
          onPress={props.onChangeIdentifier}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text weight="medium" style={{ textDecorationLine: "underline" }}>
            {props.changeLabel}
          </Text>
        </Pressable>
      </View>
      <FormErrorSummary message={props.globalMessage} />
      <TextField
        label="Six digit code"
        mono
        autoFocus
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        value={props.code}
        onChangeText={(value) => props.onCodeChange(sanitizeCode(value))}
        onSubmitEditing={() => {
          if (ready && !props.pending) {
            props.onVerify();
          }
        }}
        editable={!props.pending}
        error={props.codeError}
      />
      <ResendCountdown
        startedAt={props.startedAt}
        onResend={props.onResend}
        disabled={props.pending}
      />
      <View style={{ gap: 12 }}>
        <Button
          label="Verify"
          size="lg"
          pending={ready && props.pending}
          disabled={!ready || props.pending}
          onPress={props.onVerify}
        />
        {ready ? null : (
          <Text size="eyebrow" tone="muted" style={{ textAlign: "center" }}>
            Button unlocks at six digits
          </Text>
        )}
      </View>
    </View>
  );
}
