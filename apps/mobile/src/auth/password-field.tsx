import { radii } from "@repo/design-tokens";
import { Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { TextField, type TextFieldProps } from "../primitives/text-field";
import { useColors } from "../theme/theme-provider";
import { passwordStrength } from "./password-strength";

const TOGGLE = 48;
const ICON = 18;

export type PasswordFieldProps = Omit<
  TextFieldProps,
  "secureTextEntry" | "trailing" | "value" | "onChangeText"
> & {
  value: string;
  onChangeText: (value: string) => void;
  /** Show the four strength segments and the hint under the field. */
  strength?: boolean;
};

export function PasswordField({
  value,
  onChangeText,
  strength = false,
  editable,
  ...props
}: PasswordFieldProps) {
  const m = useMessages();
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  const segments = passwordStrength(value);

  return (
    <View style={{ gap: 8 }}>
      <TextField
        {...props}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        ltr
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              visible
                ? m.mobileHome.passwordField.hide
                : m.mobileHome.passwordField.show
            }
            disabled={editable === false}
            onPress={() => setVisible((current) => !current)}
            style={{
              width: TOGGLE,
              height: TOGGLE,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.md,
              borderWidth: hairline,
              borderColor: colors.inputBorder,
              opacity: editable === false ? 0.5 : 1,
            }}
          >
            {visible ? (
              <EyeOff size={ICON} color={colors.ink} />
            ) : (
              <Eye size={ICON} color={colors.ink} />
            )}
          </Pressable>
        }
      />
      {strength ? (
        <View style={{ gap: 6 }}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ flexDirection: "row", gap: 6 }}
          >
            {segments.map((met, index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: met ? colors.ink : colors.rule,
                }}
              />
            ))}
          </View>
          <Text size="eyebrow" tone="muted">
            {m.mobileHome.passwordField.strengthHint}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
