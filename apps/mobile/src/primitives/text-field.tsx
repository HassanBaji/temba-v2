import { expanded, radii, spacing, typeScale } from "@repo/design-tokens";
import { forwardRef } from "react";
import { TextInput, View, type TextInputProps } from "react-native";

import { isLayoutRtl } from "../i18n/rtl";
import { useColors } from "../theme/theme-provider";
import { fontFamilyFor, type TextWidth } from "./font-family";
import { hairline } from "./hairline-width";
import { Text } from "./text";
import { inputDirectionStyle } from "./text-direction";

const FIELD_HEIGHT = 48;
const MULTILINE_MIN_HEIGHT = 96;

export function inputType(size: number, width: TextWidth) {
  return {
    fontFamily: fontFamilyFor({ weight: "regular", width, mono: false }),
    fontSize: size,
    letterSpacing:
      width === "expanded" ? expanded.letterSpacingEm * size : undefined,
    fontVariant: ["tabular-nums" as const],
  };
}

export type TextFieldProps = Omit<TextInputProps, "style"> & {
  label?: string;
  error?: string;
  mono?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /**
   * The value reads LTR as a unit (phone, email, code, password, URL).
   * `"row"` also lays `leading` and `trailing` out LTR around it, for a
   * prefix that belongs to the value, such as a calling code.
   */
  ltr?: boolean | "row";
};

export const TextField = forwardRef<TextInput, TextFieldProps>(
  function TextField(
    {
      label,
      error,
      mono = false,
      leading,
      trailing,
      ltr = false,
      editable,
      ...props
    },
    ref,
  ) {
    const colors = useColors();
    const invalid = Boolean(error);
    const disabled = editable === false;

    return (
      <View style={{ gap: 6 }}>
        {label ? (
          <Text size="meta" tone="muted">
            {label}
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            direction: ltr === "row" ? "ltr" : undefined,
          }}
        >
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
              height: props.multiline ? undefined : FIELD_HEIGHT,
              minHeight: props.multiline ? MULTILINE_MIN_HEIGHT : undefined,
              paddingTop: props.multiline ? 12 : undefined,
              paddingBottom: props.multiline ? 12 : undefined,
              textAlignVertical: props.multiline ? "top" : undefined,
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
              ...inputDirectionStyle(isLayoutRtl(), Boolean(ltr)),
            }}
          />
          {trailing}
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
