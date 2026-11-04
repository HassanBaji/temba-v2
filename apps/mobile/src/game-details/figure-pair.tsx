import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

type Figure = { key: string; value: string; label: string; unset?: boolean };

export function FigurePair({ figures }: { figures: Figure[] }) {
  const palette = useTonePalette();
  const m = useMessages();
  return (
    <View style={{ flexDirection: "row" }}>
      {figures.map((figure, index) => (
        <View
          key={figure.key}
          accessible
          accessibilityLabel={m.mobileGameDetails.figure(
            figure.label,
            figure.value,
          )}
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
            tone={figure.unset ? "muted" : "default"}
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
