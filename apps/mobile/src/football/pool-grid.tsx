import { radii } from "@repo/design-tokens";
import { KEEPER_CODE } from "@repo/domain/football-lineup";
import { Pressable, View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { SurfaceToneContext } from "../primitives/surface-context";
import { tonePalette } from "../primitives/tone-palette";
import { Text } from "../primitives/text";
import {
  levelLabel,
  shortName,
  slotCode,
  type BoardPlayer,
} from "./football-model";

const COLUMNS = 4;
const GAP = 8;
const TILE_HEIGHT = 74;

type Cell =
  | { kind: "player"; player: BoardPlayer }
  | { kind: "open"; key: string };

function CodeTag({ code }: { code: string | null }) {
  if (code === KEEPER_CODE) {
    return (
      <SurfaceToneContext.Provider value="ink">
        <View
          style={{
            backgroundColor: tonePalette("ink").background,
            borderRadius: 4,
            paddingHorizontal: 4,
            paddingVertical: 1,
          }}
        >
          <Text size="eyebrow" mono>
            {code}
          </Text>
        </View>
      </SurfaceToneContext.Provider>
    );
  }
  return code ? (
    <Text size="eyebrow" tone="muted" mono>
      {code}
    </Text>
  ) : null;
}

function PlayerTile({
  player,
  onPress,
}: {
  player: BoardPlayer;
  onPress?: (userId: string) => void;
}) {
  const tone = player.isViewer ? "ink" : "paper";
  const palette = tonePalette(tone);
  const name = player.isViewer ? "You" : shortName(player.name);
  const code = slotCode(player);
  return (
    <SurfaceToneContext.Provider value={tone}>
      <Pressable
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={[name, code, levelLabel(player.levelBand)]
          .filter(Boolean)
          .join(", ")}
        disabled={!onPress}
        onPress={() => onPress?.(player.userId)}
        style={{
          flex: 1,
          height: TILE_HEIGHT,
          padding: 8,
          justifyContent: "space-between",
          borderRadius: radii.md,
          backgroundColor: palette.background,
          borderWidth: hairline,
          borderColor: player.isViewer ? palette.background : palette.rule,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Avatar name={player.name} uri={player.image} size="sm" />
          <CodeTag code={code} />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 4,
          }}
        >
          <Text size="eyebrow" numberOfLines={1} style={{ flexShrink: 1 }}>
            {name}
          </Text>
          <Text size="meta" width="expanded" weight="bold">
            {levelLabel(player.levelBand)}
          </Text>
        </View>
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}

export function OpenTile({ height = TILE_HEIGHT }: { height?: number }) {
  return (
    <View
      style={{
        flex: 1,
        height,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Hatch radius={radii.md} />
      <Text size="eyebrow" tone="muted">
        open
      </Text>
    </View>
  );
}

/** Players four to a row, then hatched open seats. */
export function PoolGrid({
  players,
  open,
  onOpenPlayer,
}: {
  players: readonly BoardPlayer[];
  open: number;
  onOpenPlayer?: (userId: string) => void;
}) {
  const cells: Cell[] = [
    ...players.map((player) => ({ kind: "player" as const, player })),
    ...Array.from({ length: open }, (_, index) => ({
      kind: "open" as const,
      key: `open-${index}`,
    })),
  ];
  const rows: Cell[][] = [];
  for (let index = 0; index < cells.length; index += COLUMNS) {
    rows.push(cells.slice(index, index + COLUMNS));
  }
  return (
    <View style={{ gap: GAP }}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: "row", gap: GAP }}>
          {row.map((cell) =>
            cell.kind === "player" ? (
              <PlayerTile
                key={cell.player.userId}
                player={cell.player}
                onPress={onOpenPlayer}
              />
            ) : (
              <OpenTile key={cell.key} />
            ),
          )}
          {Array.from({ length: COLUMNS - row.length }, (_, index) => (
            <View key={`pad-${index}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}
