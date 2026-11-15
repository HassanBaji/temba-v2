import { radii, sizes } from "@repo/design-tokens";
import {
  GAME_PAYMENT_NOTE_MAX_LENGTH,
  GAME_PAYMENT_RETURN_REASONS,
  type GamePaymentReturnReason,
} from "@repo/domain/game-payments";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { InitialsTile } from "../primitives/initials-tile";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useColors } from "../theme/theme-provider";
import { PaymentBox } from "./payment-card";
import { PaymentMarkIcon } from "./payment-mark";

export type NotReceivedTarget = {
  userId: string;
  name: string;
  image: string | null;
  claimedLine: string;
  price: string;
};

/** A short note goes back to the player (design Payments 2b). */
export function NotReceivedSheet({
  target,
  pending,
  onClose,
  onSubmit,
}: {
  target: NotReceivedTarget | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (args: {
    reason: GamePaymentReturnReason | null;
    note: string;
  }) => void;
}) {
  const colors = useColors();
  const m = useMessages().gamePayments.notReceivedSheet;
  const [reason, setReason] = useState<GamePaymentReturnReason | null>(
    "nothing_arrived",
  );
  const [note, setNote] = useState("");

  useEffect(() => {
    if (target) {
      setReason("nothing_arrived");
      setNote("");
    }
  }, [target]);

  return (
    <Sheet
      visible={target != null}
      onClose={onClose}
      title={m.title}
      subtitle={target?.claimedLine}
      closeButton
      keyboardShouldPersistTaps="handled"
    >
      {target ? (
        <PaymentBox>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <InitialsTile name={target.name} uri={target.image} size="md" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="semibold" numberOfLines={1}>
                {target.name}
              </Text>
              <Text size="eyebrow" tone="muted">
                {target.price}
              </Text>
            </View>
            <PaymentMarkIcon mark="claimed" />
          </View>
        </PaymentBox>
      ) : null}
      <View style={{ gap: 8 }}>
        <Text size="meta" tone="muted">
          {m.why}
        </Text>
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
        >
          {GAME_PAYMENT_RETURN_REASONS.map((value) => {
            const selected = reason === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setReason(selected ? null : value)}
                style={{
                  minHeight: sizes.touchTarget - 8,
                  paddingHorizontal: 12,
                  borderRadius: radii.md,
                  justifyContent: "center",
                  backgroundColor: selected ? colors.control : colors.paper,
                  borderWidth: hairline,
                  borderColor: selected ? colors.controlEdge : colors.rule,
                }}
              >
                <Text
                  size="meta"
                  style={selected ? { color: colors.onControl } : undefined}
                >
                  {m.reasons[value]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextField
          label={m.noteLabel}
          value={note}
          maxLength={GAME_PAYMENT_NOTE_MAX_LENGTH}
          onChangeText={setNote}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={m.cancel}
            variant="outline"
            size="lg"
            onPress={onClose}
          />
        </View>
        <View style={{ flex: 1.6 }}>
          <Button
            label={m.submit}
            size="lg"
            pending={pending}
            onPress={() => onSubmit({ reason, note })}
          />
        </View>
      </View>
    </Sheet>
  );
}
