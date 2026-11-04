import { radii, spacing } from "@repo/design-tokens";
import type { PlayerLevelCardView } from "@repo/domain/player-profile-level";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
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
  const m = useMessages();
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
        accessibilityLabel={m.mobilePlayer.profile.levelSpoken(view.label)}
        style={[tile, { backgroundColor: undefined, gap: 4 }]}
      >
        <Hatch radius={radii.md} />
        <Text size="meta" tone="muted">
          {m.common.level}
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
      accessibilityLabel={
        trend
          ? m.mobilePlayer.profile.levelWithTrendSpoken(
              view.accessibilityLabel,
              trend,
            )
          : view.accessibilityLabel
      }
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
          {m.common.level}
        </Text>
        {view.provisional ? (
          <Text size="meta" tone="muted">
            {m.mobilePlayer.profile.provisional}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
        <Text size="hero" width="expanded" weight="bold" ltr>
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
