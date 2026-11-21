import { bibColors, radii } from "@repo/design-tokens";
import {
  boardTierCell,
  lineupName,
  ovrLabel,
  ovrSpoken,
  slotCode,
  teamsSideAverage,
  type Bibs,
  type BoardPlayer,
  type Side,
} from "@repo/domain/football-board";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import type { Locale } from "@repo/i18n/locale";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { useTonePalette } from "../primitives/surface-context";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors, useColorSchemeName } from "../theme/theme-provider";
import { BibChip } from "./bib-picker";
import { TierMark } from "./team-columns";

const ROW_HEIGHT = 44;
const MARK_SIZE = 16;
const TURN_DOT = 7;
const SELECT_BOX = 18;

export type PickedRow = { userId: string; pickNumber: number | null };

/** The level a pool tile shows any player: the Tier cell in a tier Group, else the OVR. */
function levelText(player: BoardPlayer, locale: Locale) {
  return boardTierCell(player, locale)?.label ?? ovrLabel(player);
}

function PickedPlayerRow({
  player,
  row,
  bib,
  captain,
}: {
  player: BoardPlayer;
  row: PickedRow;
  bib: Bibs["slot1"];
  captain: boolean;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const palette = useTonePalette();
  const scheme = useColorSchemeName();
  const { fill, on } = bibColors[bib];
  const blendsIn =
    scheme === "dark" ? bib === "black" : fill === palette.background;
  const { name, spoken } = lineupName(player, locale);
  const meta = [slotCode(player, locale), levelText(player, locale)]
    .filter(Boolean)
    .join(" ");
  const label = [
    row.pickNumber != null
      ? messages.football.pick.pickedSpoken(row.pickNumber, spoken)
      : spoken,
    captain ? messages.football.captains.spoken : null,
    slotCode(player, locale),
    boardTierCell(player, locale)?.label ?? ovrSpoken(player, locale),
  ]
    .filter(Boolean)
    .join(messages.common.listSeparator);
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        height: ROW_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 8,
        borderRadius: radii.md,
        backgroundColor: fill,
        borderWidth: hairline,
        borderColor: blendsIn ? palette.muted : fill,
      }}
    >
      {captain ? (
        <View
          style={{
            width: MARK_SIZE,
            height: MARK_SIZE,
            borderRadius: radii.slot,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: on,
          }}
        >
          <Text size="eyebrow" weight="semibold" style={{ color: fill }}>
            {messages.football.captains.badge}
          </Text>
        </View>
      ) : (
        <Text
          size="eyebrow"
          mono
          style={{
            width: MARK_SIZE,
            textAlign: "center",
            color: on,
            opacity: 0.7,
          }}
        >
          {row.pickNumber ?? ""}
        </Text>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="meta" numberOfLines={1} style={{ color: on }}>
          {name}
        </Text>
        <Text
          size="eyebrow"
          mono
          numberOfLines={1}
          style={{ color: on, opacity: 0.7 }}
        >
          {meta}
        </Text>
      </View>
    </View>
  );
}

function NextPickCell({
  team,
  pickNumber,
}: {
  team: string;
  pickNumber: number;
}) {
  const colors = useColors();
  const m = useMessages().football.pick;
  return (
    <View
      accessible
      accessibilityLabel={m.nextPickSpoken(team, pickNumber)}
      style={{
        height: ROW_HEIGHT,
        borderRadius: radii.md,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Hatch radius={radii.md} />
      <View
        style={{
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: radii.slot,
          backgroundColor: colors.paper,
        }}
      >
        <Text size="eyebrow" tone="muted">
          {m.nextPick(pickNumber)}
        </Text>
      </View>
    </View>
  );
}

/**
 * The two sides of a Captain pick (design 4c), side by side: the Side
 * captain first with a C, then each pick with its number, and a hatched
 * cell for the next pick on the side on turn. Under them each side's
 * average, by `teamsSideAverage`.
 */
export function PickSides({
  sides,
  captains,
  bibs,
  teams,
  counts,
  turn,
  nextPick,
  players,
  balanceOn,
}: {
  sides: { slot1: readonly PickedRow[]; slot2: readonly PickedRow[] };
  captains: { slot1: string | null; slot2: string | null };
  bibs: Bibs;
  teams: { slot1: string; slot2: string };
  counts: { slot1: string; slot2: string };
  turn: Side | null;
  nextPick: number;
  players: readonly BoardPlayer[];
  balanceOn: FootballBalanceOn;
}) {
  const colors = useColors();
  const locale = useLocale();
  const m = useMessages().football.pick;
  const byId = new Map(players.map((player) => [player.userId, player]));
  const rowsOf = (side: Side) =>
    (side === 1 ? sides.slot1 : sides.slot2).flatMap((row) => {
      const player = byId.get(row.userId);
      return player ? [{ row, player }] : [];
    });
  const column = (side: Side) => {
    const bib = side === 1 ? bibs.slot1 : bibs.slot2;
    const team = side === 1 ? teams.slot1 : teams.slot2;
    const captain = side === 1 ? captains.slot1 : captains.slot2;
    return (
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingBottom: 2,
          }}
        >
          <BibChip bib={bib} size={18} />
          <Text size="meta" weight="semibold" numberOfLines={1}>
            {team}
          </Text>
          <View
            style={{
              width: TURN_DOT,
              height: TURN_DOT,
              borderRadius: TURN_DOT / 2,
              backgroundColor: turn === side ? colors.ink : "transparent",
            }}
          />
          <Text
            size="eyebrow"
            tone="muted"
            numberOfLines={1}
            style={{ marginStart: "auto" }}
          >
            {side === 1 ? counts.slot1 : counts.slot2}
          </Text>
        </View>
        {rowsOf(side).map(({ row, player }) => (
          <PickedPlayerRow
            key={row.userId}
            player={player}
            row={row}
            bib={bib}
            captain={captain === row.userId}
          />
        ))}
        {turn === side ? (
          <NextPickCell team={team} pickNumber={nextPick} />
        ) : null}
      </View>
    );
  };
  const average = (side: Side) =>
    m.sideAverage(
      side === 1 ? teams.slot1 : teams.slot2,
      teamsSideAverage(
        rowsOf(side).map(({ player }) => player),
        locale,
        balanceOn,
      ),
    );
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {column(1)}
        {column(2)}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Text size="eyebrow" tone="muted">
          {average(1)}
        </Text>
        <Text size="eyebrow" tone="muted">
          {average(2)}
        </Text>
      </View>
    </View>
  );
}

/**
 * The pool of a live Captain pick, in the order the domain gives it, with
 * each player's position and level. While the viewer may pick, a tap
 * selects a player; otherwise the pool is muted.
 */
export function PickPool({
  pool,
  head,
  selectable,
  selected,
  onSelect,
}: {
  pool: readonly BoardPlayer[];
  head: string;
  selectable: boolean;
  selected: string | null;
  onSelect: (userId: string | null) => void;
}) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.pick;
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <Text size="meta" tone="muted">
          {m.poolTitle}
        </Text>
        <Text size="eyebrow" tone="muted">
          {head}
        </Text>
      </View>
      <Surface padded={false} style={{ overflow: "hidden" }}>
        {pool.map((player, index) => {
          const cell = boardTierCell(player, locale);
          const on = selected === player.userId;
          const tone = selectable ? "default" : "muted";
          const { name, spoken } = lineupName(player, locale);
          return (
            <Pressable
              key={player.userId}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: !selectable }}
              accessibilityLabel={[
                spoken,
                slotCode(player, locale),
                cell ? cell.label : ovrSpoken(player, locale),
              ]
                .filter(Boolean)
                .join(messages.common.listSeparator)}
              disabled={!selectable}
              onPress={() => onSelect(on ? null : player.userId)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 9,
                paddingHorizontal: 14,
                borderTopWidth: index === 0 ? 0 : hairline,
                borderTopColor: colors.rule,
                backgroundColor: on ? colors.wash : "transparent",
              }}
            >
              <Avatar name={player.name} uri={player.image} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text weight="semibold" tone={tone} numberOfLines={1}>
                  {name}
                </Text>
                <Text size="eyebrow" mono tone="muted">
                  {slotCode(player, locale)}
                </Text>
              </View>
              {cell ? (
                <TierMark cell={cell} />
              ) : (
                <Text weight="bold" width="expanded" tone={tone} ltr>
                  {ovrLabel(player)}
                </Text>
              )}
              {selectable ? (
                <View
                  style={{
                    width: SELECT_BOX,
                    height: SELECT_BOX,
                    borderRadius: radii.slot,
                    borderWidth: hairline,
                    borderColor: on ? colors.controlEdge : colors.inputBorder,
                    backgroundColor: on ? colors.control : colors.paper,
                  }}
                />
              ) : null}
            </Pressable>
          );
        })}
      </Surface>
    </View>
  );
}
