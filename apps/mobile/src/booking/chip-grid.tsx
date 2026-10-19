import { colors, radii, sizes } from "@repo/design-tokens";
import { Pressable, View } from "react-native";

import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";

const TILE_GAP = 8;

export type ChipTileProps = {
  label: string;
  sublabel?: string;
  selected?: boolean;
  struck?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
};

/** A bordered choice tile: ink when selected, struck through when not offered. */
export function ChipTile({
  label,
  sublabel,
  selected = false,
  struck = false,
  disabled = false,
  accessibilityLabel,
  onPress,
}: ChipTileProps) {
  const inactive = struck || disabled;
  const foreground = selected
    ? colors.paper
    : inactive
      ? colors.muted
      : colors.ink;
  const lineThrough = struck ? ("line-through" as const) : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ??
        [label, sublabel, struck ? "Unavailable" : null]
          .filter(Boolean)
          .join(", ")
      }
      accessibilityState={{ selected, disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: sizes.touchTarget,
        paddingVertical: 8,
        paddingHorizontal: 4,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: selected ? colors.ink : colors.rule,
        backgroundColor: selected ? colors.ink : colors.paper,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        weight={selected ? "semibold" : "medium"}
        numberOfLines={1}
        style={{ color: foreground, textDecorationLine: lineThrough }}
      >
        {label}
      </Text>
      {sublabel ? (
        <Text
          size="eyebrow"
          numberOfLines={1}
          style={{
            color: selected ? colors.dim : colors.muted,
            textDecorationLine: lineThrough,
          }}
        >
          {sublabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Lays tiles out in rows of `columns`, padding the last row so tiles keep one width. */
export function ChipGrid({
  columns,
  children,
}: {
  columns: number;
  children: React.ReactNode[];
}) {
  const rows: React.ReactNode[][] = [];
  for (let index = 0; index < children.length; index += columns) {
    rows.push(children.slice(index, index + columns));
  }
  return (
    <View style={{ gap: TILE_GAP }}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: "row", gap: TILE_GAP }}>
          {row}
          {Array.from({ length: columns - row.length }, (_, pad) => (
            <View key={`pad-${pad}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}
