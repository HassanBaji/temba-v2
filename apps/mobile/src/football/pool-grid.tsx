import { radii } from "@repo/design-tokens";
import { fishSizes } from "@repo/design-tokens/fish";
import { Pressable, View } from "react-native";

import { TierFish } from "../groups/tier-fish";
import { NicknameName } from "../primitives/nickname-name";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import {
  SurfaceToneContext,
  useTonePalette,
} from "../primitives/surface-context";
import { tonePalette } from "../primitives/tone-palette";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import {
  poolSections,
  poolTileName,
  poolTileTier,
  slotCode,
  type BoardPlayer,
  type PoolTileTier,
} from "@repo/domain/football-board";

const COLUMNS = 3;
const GAP = 8;
const TILE_HEIGHT = 108;

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
            borderRadius: radii.slot,
            paddingHorizontal: 5,
            paddingVertical: 2,
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
    <Text size="eyebrow" tone="muted" mono style={{ paddingTop: 3 }}>
      {code}
    </Text>
  ) : null;
}

/** The hatched "not yet" badge, the width of a fish. */
function ProvisionalBadge() {
  const palette = useTonePalette();
  return (
    <View
      style={{
        ...fishSizes.tile,
        borderRadius: 4,
        borderWidth: hairline,
        borderColor: palette.muted,
        overflow: "hidden",
      }}
    >
      <Hatch radius={0} bordered={false} />
    </View>
  );
}

function TierLine({
  tier,
  background,
}: {
  tier: PoolTileTier;
  background: string;
}) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginTop: 4,
        minWidth: 0,
      }}
    >
      {tier.mark?.kind === "fish" ? (
        <TierFish
          band={tier.mark.band}
          label={tier.label}
          size="tile"
          color={palette.foreground}
          cutout={background}
        />
      ) : tier.mark?.kind === "hatch" ? (
        <ProvisionalBadge />
      ) : null}
      <Text
        size="eyebrow"
        tone="muted"
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {tier.label}
      </Text>
    </View>
  );
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
  const { name, spoken, isNickname } = poolTileName(player, locale);
  const code = slotCode(player, locale);
  const tier = poolTileTier(player, locale);
  const background = player.isViewer ? colors.control : palette.background;
  return (
    <SurfaceToneContext.Provider value={tone}>
      <Pressable
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={[spoken, code, tier.spoken]
          .filter(Boolean)
          .join(messages.tournament.listSeparator)}
        disabled={!onPress}
        onPress={() => onPress?.(player.userId)}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: TILE_HEIGHT,
          padding: 12,
          gap: 10,
          justifyContent: "space-between",
          borderRadius: radii.card,
          backgroundColor: background,
          borderWidth: hairline,
          borderColor: player.isViewer ? colors.controlEdge : palette.rule,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          <Avatar name={player.name} uri={player.image} guest={player.guest} />
          <CodeTag code={code} keeper={player.role === "keeper"} />
        </View>
        <View style={{ minWidth: 0 }}>
          <NicknameName name={name} isNickname={isNickname} size="meta" />
          <TierLine tier={tier} background={background} />
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
        minHeight: TILE_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Hatch radius={radii.card} />
      <Text size="meta" tone="muted">
        {m.open}
      </Text>
    </View>
  );
}

/**
 * Players three to a row, then hatched open seats. Under each name, its own
 * line for the player's Group Tier in a tier Group, or their OVR elsewhere.
 */
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
