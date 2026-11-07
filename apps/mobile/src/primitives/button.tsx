import { radii, spacing, type Palette } from "@repo/design-tokens";
import { ActivityIndicator, Pressable, View } from "react-native";

import { useColors } from "../theme/theme-provider";
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
  accessibilityLabel?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  pending?: boolean;
  disabled?: boolean;
  selected?: boolean;
  icon?: React.ReactNode;
  iconPlacement?: "leading" | "trailing";
};

type Colorway = {
  background: string;
  foreground: string;
  border: string | null;
};

function colorways(colors: Palette): Record<ButtonVariant, Colorway> {
  return {
    default: {
      background: colors.control,
      foreground: colors.onControl,
      border: colors.controlEdge,
    },
    outline: {
      background: colors.paper,
      foreground: colors.ink,
      border: colors.inputBorder,
    },
    inverse: {
      background: colors.focusControl,
      foreground: colors.onFocusControl,
      border: null,
    },
    "outline-inverse": {
      background: colors.focus,
      foreground: colors.onFocus,
      border: colors.dimrule,
    },
  };
}

export function Button({
  label,
  accessibilityLabel,
  onPress,
  variant,
  size = "default",
  pending = false,
  disabled = false,
  selected,
  icon,
  iconPlacement = "leading",
}: ButtonProps) {
  const tone = useSurfaceTone();
  const resolved = variant ?? (tone === "ink" ? "inverse" : "default");
  const colorway = colorways(useColors())[resolved];
  const { height, hitSlop } = buttonGeometry(size);
  const inactive = disabled || pending;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
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
          {icon && iconPlacement === "leading" ? <View>{icon}</View> : null}
          {size === "icon" ? null : (
            <Text
              weight="medium"
              style={{ color: colorway.foreground }}
              numberOfLines={1}
            >
              {label}
            </Text>
          )}
          {icon && iconPlacement === "trailing" ? <View>{icon}</View> : null}
        </>
      )}
    </Pressable>
  );
}
