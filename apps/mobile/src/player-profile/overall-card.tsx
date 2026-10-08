import { spacing } from "@repo/design-tokens";
import type {
  PlayerOverallTile,
  PlayerOverallView,
} from "@repo/domain/player-profile";
import { View } from "react-native";

import { Card } from "../home/card";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

function Tile({ tile }: { tile: PlayerOverallTile }) {
  return (
    <View
      accessible
      accessibilityLabel={`${tile.label} ${tile.value}`}
      style={{ flex: 1, padding: spacing.surface, gap: 4 }}
    >
      <Text size="meta" tone="muted">
        {tile.label}
      </Text>
      <Text size="figure" width="expanded" weight="bold">
        {tile.value}
      </Text>
    </View>
  );
}

export function PlayerOverallCard({ view }: { view: PlayerOverallView }) {
  const palette = useTonePalette();
  const rows = [view.tiles.slice(0, 2), view.tiles.slice(2, 4)];

  return (
    <Card title={view.title} meta={view.scope} flush>
      {rows.map((row, index) => (
        <View key={index}>
          {index > 0 ? <Hairline /> : null}
          <View style={{ flexDirection: "row" }}>
            {row.map((tile, column) => (
              <View key={tile.label} style={{ flex: 1, flexDirection: "row" }}>
                {column > 0 ? (
                  <View
                    style={{ width: hairline, backgroundColor: palette.rule }}
                  />
                ) : null}
                <Tile tile={tile} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </Card>
  );
}
