import { radii, spacing } from "@repo/design-tokens";
import type {
  CourtSideFill,
  PlayedSideView,
} from "@repo/domain/player-profile";
import { View } from "react-native";

import { Card } from "../home/card";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const COURT_WIDTH = 56;
const HALF_HEIGHT = 40;

function NearSide({ fill }: { fill: CourtSideFill }) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: fill === "ink" ? palette.foreground : undefined,
      }}
    >
      {fill === "hatch" ? <Hatch radius={0} bordered={false} /> : null}
    </View>
  );
}

function Court({ court }: { court: PlayedSideView["court"] }) {
  const palette = useTonePalette();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: COURT_WIDTH,
        borderWidth: hairline,
        borderColor: palette.rule,
        borderRadius: radii.slot,
        overflow: "hidden",
      }}
    >
      <View style={{ height: HALF_HEIGHT }} />
      <View style={{ height: hairline, backgroundColor: palette.foreground }} />
      <View style={{ height: HALF_HEIGHT, flexDirection: "row" }}>
        <NearSide fill={court.left} />
        <View style={{ width: hairline, backgroundColor: palette.rule }} />
        <NearSide fill={court.right} />
      </View>
    </View>
  );
}

export function PlayerPositionCard({ view }: { view: PlayedSideView }) {
  return (
    <Card title="Preferred position">
      <View
        accessible
        accessibilityLabel={[view.label, view.subtitle]
          .filter(Boolean)
          .join(". ")}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.compact,
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.surface,
        }}
      >
        <Court court={view.court} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text size="lead" weight="semibold">
            {view.label}
          </Text>
          {view.subtitle ? (
            <Text size="meta" tone="muted">
              {view.subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
