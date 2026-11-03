import { colors, radii } from "@repo/design-tokens";
import { Pressable, View } from "react-native";

import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import type { ShareMode } from "./share-model";

const MODES: { value: ShareMode; label: string }[] = [
  { value: "story", label: "Story" },
  { value: "sticker", label: "Sticker" },
];

const TRACK_PADDING = 3;
const SEGMENT_HEIGHT = 40;

/** A wash track with the chosen mode lifted on a paper pill. */
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
        gap: TRACK_PADDING,
        padding: TRACK_PADDING,
        borderRadius: radii.lg,
        backgroundColor: colors.wash,
      }}
    >
      {MODES.map((mode) => {
        const selected = mode.value === value;
        return (
          <Pressable
            key={mode.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onSelect(mode.value)}
            style={({ pressed }) => ({
              flex: 1,
              height: SEGMENT_HEIGHT,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.lg - TRACK_PADDING,
              borderWidth: hairline,
              borderColor: selected ? colors.rule : "transparent",
              backgroundColor: selected ? colors.paper : "transparent",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              size="meta"
              weight={selected ? "semibold" : "regular"}
              tone={selected ? "default" : "muted"}
            >
              {mode.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
