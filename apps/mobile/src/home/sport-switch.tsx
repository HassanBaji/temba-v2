import { radii, sizes } from "@repo/design-tokens";
import type { SportSwitchLevel } from "@repo/domain/ratings-screen";
import type { Sport } from "@repo/domain/sport";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { SportGlyph } from "../lib/sport-glyph";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

const GLYPH = 16;

/**
 * A track with a solid thumb; each side shows the sport and its Level: the
 * band on padel, the number on football.
 */
export function SportSwitch({
  sports,
  value,
  levels,
  onSelect,
}: {
  sports: readonly Sport[];
  value: Sport;
  levels: Partial<Record<Sport, SportSwitchLevel | null>>;
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
        padding: 4,
        gap: 4,
        borderRadius: radii.lg + 2,
        backgroundColor: colors.wash,
      }}
    >
      {sports.map((sport) => {
        const selected = sport === value;
        const color = selected ? colors.paper : colors.muted;
        const level = levels[sport] ?? null;
        return (
          <Pressable
            key={sport}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={level ? level.spoken : m.common[sport]}
            onPress={() => onSelect(sport)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: sizes.touchTarget,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: radii.lg,
              backgroundColor: selected ? colors.ink : "transparent",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <SportGlyph sport={sport} color={color} size={GLYPH} />
            <Text weight={selected ? "semibold" : "regular"} style={{ color }}>
              {m.common[sport]}
            </Text>
            {level ? (
              <Text
                size="meta"
                width="expanded"
                weight="bold"
                ltr
                style={{ color, opacity: selected ? 0.6 : 1 }}
              >
                {level.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
