import type { FriendlyGameHeroFigure } from "@repo/domain/friendly-game-hero";
import { View } from "react-native";

import { hairline } from "../primitives/hairline-width";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

export function FigurePair({ figures }: { figures: FriendlyGameHeroFigure[] }) {
  const palette = useTonePalette();
  return (
    <View style={{ flexDirection: "row" }}>
      {figures.map((figure, index) => (
        <View
          key={figure.key}
          accessible
          accessibilityLabel={`${figure.label}: ${figure.value}`}
          style={{
            flex: 1,
            minWidth: 0,
            gap: 2,
            paddingLeft: index > 0 ? 16 : 0,
            borderLeftWidth: index > 0 ? hairline : 0,
            borderLeftColor: palette.rule,
          }}
        >
          <Text
            size="figure"
            width="expanded"
            weight="bold"
            numberOfLines={1}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {figure.value}
          </Text>
          <Text
            size="meta"
            tone="muted"
            numberOfLines={1}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {figure.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
