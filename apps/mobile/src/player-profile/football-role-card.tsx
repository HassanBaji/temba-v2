import { radii, spacing } from "@repo/design-tokens";
import type { FootballRoleView } from "@repo/domain/player-profile-football";
import { View } from "react-native";

import { Card } from "../home/card";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const TILE_SIZE = 56;

function RoleTile({ code }: { code: string | null }) {
  const palette = useTonePalette();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: TILE_SIZE,
        height: TILE_SIZE,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: hairline,
        borderColor: palette.rule,
        borderRadius: radii.slot,
        overflow: "hidden",
      }}
    >
      {code ? (
        <Text weight="semibold">{code}</Text>
      ) : (
        <Hatch radius={0} bordered={false} />
      )}
    </View>
  );
}

export function PlayerFootballRoleCard({ view }: { view: FootballRoleView }) {
  return (
    <Card title="Preferred position">
      <View
        accessible
        accessibilityLabel={view.label}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.compact,
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.surface,
        }}
      >
        <RoleTile code={view.code} />
        <Text size="lead" weight="semibold" style={{ flex: 1 }}>
          {view.label}
        </Text>
      </View>
    </Card>
  );
}
