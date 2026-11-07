import { radii, sizes } from "@repo/design-tokens";
import { SPORTS, type Sport } from "@repo/domain/sport";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { SportGlyph } from "./sport-glyph";

export function SportSegments({
  value,
  onSelect,
}: {
  value: Sport;
  onSelect: (sport: Sport) => void;
}) {
  const m = useMessages();
  const colors = useColors();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={m.mobilePlayer.lib.sport}
      style={{
        flexDirection: "row",
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: colors.rule,
        overflow: "hidden",
      }}
    >
      {SPORTS.map((sport, index) => {
        const selected = sport === value;
        const color = selected ? colors.onControl : colors.muted;
        return (
          <Pressable
            key={sport}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onSelect(sport)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: sizes.touchTarget,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: selected ? colors.control : colors.paper,
              borderStartWidth: index === 0 ? 0 : hairline,
              borderStartColor: colors.rule,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <SportGlyph sport={sport} color={color} size={18} />
            <Text weight={selected ? "semibold" : "regular"} style={{ color }}>
              {m.common[sport]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
