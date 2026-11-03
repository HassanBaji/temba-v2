import { colors, radii, sizes } from "@repo/design-tokens";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import type { ShareMode } from "./share-model";

const MODE_VALUES: ShareMode[] = ["story", "sticker"];

export function ShareModeSegments({
  value,
  onSelect,
}: {
  value: ShareMode;
  onSelect: (mode: ShareMode) => void;
}) {
  const m = useMessages().mobilePlayer.share;
  const modes = MODE_VALUES.map((mode) => ({ value: mode, label: m[mode] }));
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={m.whatToShare}
      style={{
        flexDirection: "row",
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: colors.rule,
        overflow: "hidden",
      }}
    >
      {modes.map((mode, index) => {
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
