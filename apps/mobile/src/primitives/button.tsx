import { colors, radii, spacing } from "@repo/design-tokens";
import { ActivityIndicator, Pressable, View } from "react-native";

import { hairline } from "./hairline-width";
import { buttonGeometry, type ButtonSize } from "./button-target";
import { useSurfaceTone } from "./surface-context";
import { Text } from "./text";

export type ButtonVariant =
  | "default"
  | "outline"
  | "inverse"
  | "outline-inverse";

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  pending?: boolean;
  disabled?: boolean;
  selected?: boolean;
  icon?: React.ReactNode;
};

const VARIANTS: Record<
  ButtonVariant,
  { background: string; foreground: string; border: string | null }
> = {
  default: { background: colors.ink, foreground: colors.paper, border: null },
  outline: {
    background: colors.paper,
    foreground: colors.ink,
    border: colors.inputBorder,
  },
  inverse: { background: colors.paper, foreground: colors.ink, border: null },
  "outline-inverse": {
    background: colors.ink,
    foreground: colors.paper,
    border: colors.dimrule,
  },
};

export function Button({
  label,
  onPress,
  variant,
  size = "default",
  pending = false,
  disabled = false,
  selected,
  icon,
}: ButtonProps) {
  const tone = useSurfaceTone();
  const resolved = variant ?? (tone === "ink" ? "inverse" : "default");
  const colorway = VARIANTS[resolved];
  const { height, hitSlop } = buttonGeometry(size);
  const inactive = disabled || pending;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: pending, selected }}
      disabled={inactive}
      hitSlop={hitSlop}
      onPress={onPress}
      style={({ pressed }) => ({
        height,
        minWidth: size === "icon" ? height : undefined,
        paddingHorizontal:
          size === "icon" ? 0 : size === "lg" ? 24 : spacing.compact - 2,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        borderRadius: size === "lg" ? radii.lg : radii.md,
        backgroundColor: colorway.background,
        borderWidth: colorway.border ? hairline : 0,
        borderColor: colorway.border ?? undefined,
        opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      {pending ? (
        <ActivityIndicator color={colorway.foreground} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          {size === "icon" ? null : (
            <Text
              weight="medium"
              style={{ color: colorway.foreground }}
              numberOfLines={1}
            >
              {label}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}
