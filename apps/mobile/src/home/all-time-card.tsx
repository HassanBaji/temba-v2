import { spacing } from "@repo/design-tokens";
import { View } from "react-native";

import { Hairline } from "../primitives/hairline";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { Card } from "./card";

export function AllTimeCard({
  played,
  won,
  lost,
}: {
  played: number;
  won: number;
  lost: number;
}) {
  const palette = useTonePalette();
  const figures = [
    { key: "played", label: "Played", value: played },
    { key: "won", label: "Won", value: won },
    { key: "lost", label: "Lost", value: lost },
  ];

  return (
    <Card title="All time" flush>
      <Hairline />
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.surface,
        }}
      >
        {figures.map((figure, index) => (
          <View
            key={figure.key}
            accessible
            accessibilityLabel={`${figure.label} ${figure.value}`}
            style={{
              flex: 1,
              minWidth: 0,
              alignItems: "center",
              gap: 4,
              marginTop: 16,
              borderLeftWidth: index === 0 ? 0 : 1,
              borderLeftColor: palette.rule,
            }}
          >
            <Text size="statTotal" width="expanded" weight="bold">
              {figure.value}
            </Text>
            <Text size="meta" tone="muted">
              {figure.label}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
