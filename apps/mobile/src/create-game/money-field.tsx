import { colors, numerals, radii, sizes } from "@repo/design-tokens";
import { useRef } from "react";
import { Pressable, TextInput, View } from "react-native";

import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { inputType } from "../primitives/text-field";
import { FieldError } from "./chips";

const FIELD_HEIGHT = 56;
const INVALID_BORDER = 2;

export function MoneyField({
  value,
  onChangeText,
  accessibilityLabel,
  error,
}: {
  value: string;
  onChangeText: (value: string) => void;
  accessibilityLabel: string;
  error?: string;
}) {
  const input = useRef<TextInput>(null);
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessible={false}
        onPress={() => input.current?.focus()}
        style={{
          height: FIELD_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          borderRadius: radii.lg,
          borderWidth: error ? INVALID_BORDER : hairline,
          borderColor: colors.ink,
          backgroundColor: colors.paper,
        }}
      >
        <TextInput
          ref={input}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={error}
          selectionColor={colors.ink}
          style={{
            flex: 1,
            height: "100%",
            minHeight: sizes.touchTarget,
            color: colors.ink,
            ...inputType(numerals.figure, "expanded"),
          }}
        />
        <Text tone="muted" importantForAccessibility="no">
          BD
        </Text>
      </Pressable>
      <FieldError message={error} />
    </View>
  );
}
