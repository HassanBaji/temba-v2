import { colors, radii, spacing, typeScale } from "@repo/design-tokens";
import { forwardRef } from "react";
import { TextInput, View, type TextInputProps } from "react-native";

import { fontFamilyFor } from "./font-family";
import { hairline } from "./hairline-width";
import { Text } from "./text";

const FIELD_HEIGHT = 48;

export type TextFieldProps = Omit<TextInputProps, "style"> & {
  label?: string;
  error?: string;
  mono?: boolean;
  leading?: React.ReactNode;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(
  function TextField(
    { label, error, mono = false, leading, editable, ...props },
    ref,
  ) {
    const invalid = Boolean(error);
    const disabled = editable === false;

    return (
      <View style={{ gap: 6 }}>
        {label ? (
          <Text size="meta" tone="muted">
            {label}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {leading}
          <TextInput
            ref={ref}
            accessibilityLabel={label}
            accessibilityState={{ disabled }}
            placeholderTextColor={colors.muted}
            selectionColor={colors.ink}
            editable={editable}
            {...props}
            style={{
              flex: 1,
              height: FIELD_HEIGHT,
              paddingHorizontal: spacing.compact - 4,
              borderRadius: radii.md,
              borderWidth: invalid ? 2 : hairline,
              borderColor: invalid ? colors.ink : colors.inputBorder,
              backgroundColor: colors.paper,
              color: colors.ink,
              opacity: disabled ? 0.5 : 1,
              fontFamily: fontFamilyFor({
                weight: "regular",
                width: "normal",
                mono,
              }),
              fontSize: typeScale.lead.size,
            }}
          />
        </View>
        {error ? (
          <Text size="meta" weight="medium" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </View>
    );
  },
);
