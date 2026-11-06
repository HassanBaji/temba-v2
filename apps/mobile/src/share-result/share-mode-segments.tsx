import { radii } from "@repo/design-tokens";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import type { ShareMode } from "./share-model";

const MODE_VALUES: ShareMode[] = ["story", "sticker"];

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
  const colors = useColors();
  const m = useMessages().mobilePlayer.share;
  const modes = MODE_VALUES.map((mode) => ({ value: mode, label: m[mode] }));
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={m.whatToShare}
      style={{
        flexDirection: "row",
        gap: TRACK_PADDING,
        padding: TRACK_PADDING,
        borderRadius: radii.lg,
        backgroundColor: colors.wash,
      }}
    >
      {modes.map((mode) => {
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
