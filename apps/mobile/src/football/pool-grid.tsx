import { radii, sizes } from "@repo/design-tokens";
import { Pressable, View } from "react-native";

import { NicknameName } from "../primitives/nickname-name";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { SurfaceToneContext } from "../primitives/surface-context";
import { tonePalette } from "../primitives/tone-palette";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import {
  ovrLabel,
  ovrSpoken,
  poolSections,
  lineupName,
  slotCode,
  type BoardPlayer,
} from "@repo/domain/football-board";

const COLUMNS = 4;
const GAP = 8;
const TILE_HEIGHT = 74;

type Cell =
  | { kind: "player"; player: BoardPlayer }
  | { kind: "open"; key: string };

function CodeTag({ code, keeper }: { code: string | null; keeper: boolean }) {
  const colors = useColors();
  if (keeper) {
    return (
      <SurfaceToneContext.Provider value="ink">
        <View
          style={{
            backgroundColor: colors.control,
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
  const messages = useMessages();
  const locale = useLocale();
  const tone = player.isViewer ? "ink" : "paper";
  const colors = useColors();
  const palette = tonePalette(tone, colors);
  const { name, spoken, isNickname } = lineupName(player, locale);
  const code = slotCode(player, locale);
  return (
    <SurfaceToneContext.Provider value={tone}>
      <Pressable
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={[
          spoken,
          code,
          ovrSpoken(player, locale),
          player.guest ? messages.group.addPlayer.guest.tag : null,
        ]
          .filter(Boolean)
          .join(messages.tournament.listSeparator)}
        disabled={!onPress}
        onPress={() => onPress?.(player.userId)}
        style={{
          flex: 1,
          height: TILE_HEIGHT,
          padding: 8,
          justifyContent: "space-between",
          borderRadius: radii.md,
          backgroundColor: player.isViewer
            ? colors.control
            : palette.background,
          borderWidth: hairline,
          borderColor: player.isViewer ? colors.controlEdge : palette.rule,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Avatar
            name={player.name}
            uri={player.image}
            size="sm"
            guest={player.guest}
          />
          <CodeTag code={code} keeper={player.role === "keeper"} />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 4,
          }}
        >
          <NicknameName
            name={name}
            isNickname={isNickname}
            size="eyebrow"
            weight="regular"
            iconSize={sizes.iconRow - 4}
          />
          <Text size="meta" width="expanded" weight="bold" ltr>
            {ovrLabel(player)}
          </Text>
        </View>
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}

function OpenTile() {
  const m = useMessages().mobileTournament.pool;
  return (
    <View
      style={{
        flex: 1,
        height: TILE_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Hatch radius={radii.md} />
      <Text size="eyebrow" tone="muted">
        {m.open}
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

function PoolHeading({ title, meta }: { title: string; meta: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text size="title" weight="semibold" accessibilityRole="header">
        {title}
      </Text>
      <Text size="meta" tone="muted">
        {meta}
      </Text>
    </View>
  );
}

/**
 * The pool in two blocks: Keepers with a hatched cell per keeper seat still
 * open, then Players with the rest of the open seats.
 */
export function PoolSections({
  players,
  seats,
  onOpenPlayer,
}: {
  players: readonly BoardPlayer[];
  seats: number;
  onOpenPlayer?: (userId: string) => void;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const sections = poolSections(players, seats, locale);
  return (
    <View style={{ gap: 12 }}>
      <PoolHeading
        title={messages.mobileTournament.pool.keepers}
        meta={sections.keepersLine}
      />
      <PoolGrid
        players={sections.keepers}
        open={sections.keeperOpenSeats}
        onOpenPlayer={onOpenPlayer}
      />
      <View style={{ paddingTop: 8 }}>
        <PoolHeading
          title={messages.common.players}
          meta={sections.outfieldLine}
        />
      </View>
      <PoolGrid
        players={sections.outfield}
        open={sections.outfieldOpenSeats}
        onOpenPlayer={onOpenPlayer}
      />
    </View>
  );
}
