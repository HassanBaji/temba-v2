import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Hatch } from "../primitives/hatch";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import type { HomeStats, StatMark, StatTile } from "@repo/domain/home-stats";
import { SectionTitle } from "./section-title";

const MARK_HEIGHT = 4;
const DOT_WIDTH = 9;

function Mark({ mark }: { mark: StatMark }) {
  const colors = useColors();
  if (mark.kind === "bar") {
    return (
      <View style={{ height: MARK_HEIGHT, flexDirection: "row" }}>
        <View
          style={{
            width: `${mark.percent}%`,
            backgroundColor: colors.ink,
            borderRadius: 1,
          }}
        />
        <View style={{ flex: 1 }}>
          <Hatch radius={1} bordered={false} />
        </View>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: "row", gap: 3, height: MARK_HEIGHT }}>
      {Array.from({ length: mark.total }, (_, index) =>
        index < mark.filled ? (
          <View
            key={index}
            style={{
              width: DOT_WIDTH,
              borderRadius: 1,
              backgroundColor: colors.ink,
            }}
          />
        ) : (
          <View key={index} style={{ width: DOT_WIDTH }}>
            <Hatch radius={1} bordered={false} />
          </View>
        ),
      )}
    </View>
  );
}

function Tile({ tile }: { tile: StatTile }) {
  const m = useMessages();
  return (
    <Surface
      padded={false}
      radius="card"
      accessible
      accessibilityLabel={m.home.stats.tileSpoken(
        tile.label,
        tile.value,
        tile.caption,
      )}
      style={{ flex: 1, minWidth: 0, padding: 14, gap: 8 }}
    >
      <Text size="eyebrow" tone="muted" numberOfLines={1}>
        {tile.label}
      </Text>
      <Text size="figure" width="expanded" weight="bold" numberOfLines={1}>
        {tile.value}
      </Text>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Mark mark={tile.mark} />
      </View>
      <Text size="eyebrow" tone="muted" numberOfLines={1}>
        {tile.caption}
      </Text>
    </Surface>
  );
}

export function StatsCard({ stats }: { stats: HomeStats }) {
  const m = useMessages();
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title={m.home.stats.title} meta={stats.meta} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {stats.tiles.map((tile) => (
          <Tile key={tile.key} tile={tile} />
        ))}
      </View>
    </View>
  );
}
