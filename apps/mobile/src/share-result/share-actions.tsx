import { colors, radii } from "@repo/design-tokens";
import type { ComponentType } from "react";
import {
  ActivityIndicator,
  Pressable,
  View,
  type ColorValue,
} from "react-native";

import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";

const TILE_HEIGHT = 66;
const TILE_ICON = 18;

export type ActionTileProps = {
  label: string;
  icon: ComponentType<{ size: number; color: ColorValue }>;
  pending?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

/** A compact secondary door: an icon over a word, three to a row. */
export function ActionTile({
  label,
  icon: Icon,
  pending = false,
  disabled = false,
  onPress,
}: ActionTileProps) {
  const inactive = disabled || pending;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: pending }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: TILE_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: colors.rule,
        backgroundColor: pressed ? colors.wash : colors.paper,
        opacity: disabled && !pending ? 0.5 : 1,
      })}
    >
      {pending ? (
        <ActivityIndicator size="small" color={colors.ink} />
      ) : (
        <Icon size={TILE_ICON} color={colors.ink} />
      )}
      <Text size="eyebrow" weight="semibold" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ActionTileRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", gap: 8 }}>{children}</View>;
}
