import { colors, radii, sizes } from "@repo/design-tokens";
import { Pressable, View } from "react-native";

import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import type { ShareMode } from "./share-model";

const MODES: { value: ShareMode; label: string }[] = [
  { value: "story", label: "Story" },
  { value: "sticker", label: "Sticker" },
];

export function ShareModeSegments({
  value,
  onSelect,
}: {
  value: ShareMode;
  onSelect: (mode: ShareMode) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="What to share"
      style={{
        flexDirection: "row",
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: colors.rule,
        overflow: "hidden",
      }}
    >
      {MODES.map((mode, index) => {
        const selected = mode.value === value;
        const color = selected ? colors.paper : colors.muted;
        return (
          <Pressable
            key={mode.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onSelect(mode.value)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: sizes.touchTarget,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selected ? colors.ink : colors.paper,
              borderLeftWidth: index === 0 ? 0 : hairline,
              borderLeftColor: colors.rule,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text weight={selected ? "semibold" : "regular"} style={{ color }}>
              {mode.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
