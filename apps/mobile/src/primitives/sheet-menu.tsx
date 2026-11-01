import { colors, sizes } from "@repo/design-tokens";
import { ChevronRight } from "lucide-react-native";
import type { ComponentType } from "react";
import { Pressable, View, type ColorValue } from "react-native";

import { Hairline } from "./hairline";
import { Surface } from "./surface";
import { Text } from "./text";

const ROW_MIN_HEIGHT = 52;
const ROW_PADDING_X = 18;

export type SheetMenuRowProps = {
  label: string;
  hint?: string | null;
  icon?: ComponentType<{ size: number; color: ColorValue }>;
  trailing?: ComponentType<{ size: number; color: ColorValue }> | "chevron";
  pending?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
};

/** One action in a sheet menu list: a tappable row with an optional hint. */
export function SheetMenuRow({
  label,
  hint,
  icon: Icon,
  trailing,
  pending = false,
  disabled = false,
  accessibilityLabel,
  onPress,
}: SheetMenuRowProps) {
  const Trailing = trailing === "chevron" ? ChevronRight : trailing;
  const inactive = disabled || pending;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? (hint ? `${label}. ${hint}` : label)
      }
      accessibilityState={{ disabled: inactive, busy: pending }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: ROW_MIN_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: ROW_PADDING_X,
        paddingVertical: hint ? 12 : 0,
        backgroundColor: pressed ? colors.wash : colors.paper,
        opacity: disabled && !pending ? 0.5 : 1,
      })}
    >
      {Icon ? <Icon size={sizes.iconAction} color={colors.ink} /> : null}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight={hint ? "medium" : "regular"}>
          {pending ? `${label}…` : label}
        </Text>
        {hint ? (
          <Text size="eyebrow" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
      {Trailing ? <Trailing size={sizes.iconRow} color={colors.dim} /> : null}
    </Pressable>
  );
}

/** A bordered list of `SheetMenuRow`s separated by hairlines. */
export function SheetMenu({ children }: { children: React.ReactNode[] }) {
  const rows = children.filter(Boolean);
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      {rows.map((row, index) => (
        <View key={index}>
          {index > 0 ? <Hairline /> : null}
          {row}
        </View>
      ))}
    </Surface>
  );
}
