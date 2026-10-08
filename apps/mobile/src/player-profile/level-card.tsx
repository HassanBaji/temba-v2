import { radii, spacing } from "@repo/design-tokens";
import type { PlayerLevelCardView } from "@repo/domain/player-profile-level";
import { View } from "react-native";

import { Hatch } from "../primitives/hatch";
import { MountFill } from "../primitives/mount-fill";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

export function PlayerLevelCard({
  view,
  trend,
}: {
  view: PlayerLevelCardView;
  trend: string | null;
}) {
  const palette = useTonePalette();
  const tile = {
    borderRadius: radii.md,
    padding: spacing.surface,
    backgroundColor: palette.wash,
  };

  if (view.kind === "none") {
    return (
      <View
        accessible
        accessibilityLabel={`Level. ${view.label}`}
        style={[tile, { backgroundColor: undefined, gap: 4 }]}
      >
        <Hatch radius={radii.md} />
        <Text size="meta" tone="muted">
          Level
        </Text>
        <Text size="lead" weight="semibold">
          {view.label}
        </Text>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={[view.accessibilityLabel, trend]
        .filter(Boolean)
        .join(". ")}
      style={[tile, { gap: 12 }]}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text size="meta" tone="muted">
          Level
        </Text>
        {view.provisional ? (
          <Text size="meta" tone="muted">
            Provisional
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
        <Text size="hero" width="expanded" weight="bold">
          {view.displayBand}
        </Text>
        <Text size="h2" width="expanded" weight="bold">
          {view.level}
        </Text>
        {trend ? (
          <Text
            size="meta"
            tone="muted"
            style={{ marginLeft: "auto", flexShrink: 1 }}
          >
            {trend}
          </Text>
        ) : null}
      </View>
      <MountFill percent={view.fillPercent} hatched={view.provisional} />
      <View style={{ gap: 2 }}>
        {view.lines.map((line) => (
          <Text key={line} size="meta" tone="muted">
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}
