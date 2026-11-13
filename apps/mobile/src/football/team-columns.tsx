import { bibColors, radii } from "@repo/design-tokens";
import {
  type FootballBalanceOn,
  type FootballBib,
} from "@repo/domain/football-lineup";
import type { GroupMemberTierCell } from "@repo/domain/group-members-table";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { useTonePalette } from "../primitives/surface-context";
import { useColors, useColorSchemeName } from "../theme/theme-provider";
import { Text } from "../primitives/text";
import { TierCell } from "../groups/tier-fish";
import { BibChip } from "./bib-picker";
import {
  boardTierCell,
  byKeeperThenLevel,
  levelLabel,
  makeTeamsLevelLabel,
  shortName,
  sideOvrAverage,
  slotCode,
  type Bibs,
  type BoardPlayer,
} from "@repo/domain/football-board";

const ROW_HEIGHT = 44;

/** A player's fish on a paper tile, so it reads on any bib colour. */
export function TierMark({ cell }: { cell: GroupMemberTierCell }) {
  const colors = useColors();
  return (
    <View
      style={{
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: radii.sm,
        backgroundColor: colors.paper,
      }}
    >
      <TierCell cell={cell} />
    </View>
  );
}

/**
 * A player row in their team's bib colour; the viewer's row is ringed.
 * `showTier` puts the player's fish where the Level sits, in a tier Group;
 * `balanceOn` shows the OVR there when Make teams balances on it.
 */
export function BibRow({
  player,
  bib,
  trailing,
  onPress,
  showTier = false,
  balanceOn,
}: {
  player: BoardPlayer;
  bib: FootballBib;
  trailing?: React.ReactNode;
  onPress?: () => void;
  showTier?: boolean;
  balanceOn?: FootballBalanceOn;
}) {
  const messages = useMessages();
  const locale = useLocale();
  const palette = useTonePalette();
  const { fill, on } = bibColors[bib];
  const scheme = useColorSchemeName();
  // In dark the black bib sinks into both the page and the lifted hero.
  const blendsIn =
    scheme === "dark" ? bib === "black" : fill === palette.background;
  const edge = blendsIn ? palette.muted : fill;
  const name = player.isViewer ? messages.common.you : shortName(player.name);
  const code = slotCode(player, locale);
  const tierCell = showTier ? boardTierCell(player, locale) : null;
  const level = balanceOn
    ? makeTeamsLevelLabel(player, balanceOn)
    : levelLabel(player.levelBand);
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={[name, code, tierCell ? tierCell.label : level]
        .filter(Boolean)
        .join(messages.tournament.listSeparator)}
      disabled={!onPress}
      onPress={onPress}
      style={{
        height: ROW_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
        borderRadius: radii.md,
        backgroundColor: fill,
        borderWidth: player.isViewer ? 2 : hairline,
        borderColor: player.isViewer ? palette.foreground : edge,
      }}
    >
      <Avatar name={player.name} uri={player.image} size="sm" />
      <Text
        size="meta"
        weight={player.isViewer ? "semibold" : "regular"}
        numberOfLines={1}
        style={{ flex: 1, color: on }}
      >
        {name}
      </Text>
      {code ? (
        <Text size="eyebrow" mono style={{ color: on, opacity: 0.7 }}>
          {code}
        </Text>
      ) : null}
      {tierCell ? (
        <TierMark cell={tierCell} />
      ) : (
        <Text
          size="meta"
          width="expanded"
          weight="bold"
          ltr
          style={{ color: on }}
        >
          {level}
        </Text>
      )}
      {trailing}
    </Pressable>
  );
}

/**
 * A published side's heading. The mean reads in OVR, and is left out in a
 * tier Group, where the rows show fish and points are not everyone's to see.
 */
export function TeamHeader({
  bib,
  name,
  players,
  balanceOn,
}: {
  bib: FootballBib;
  name: string;
  players: readonly BoardPlayer[];
  balanceOn: FootballBalanceOn;
}) {
  const messages = useMessages();
  const locale = useLocale();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <BibChip bib={bib} size={14} />
        <Text size="meta" weight="semibold">
          {name}
        </Text>
      </View>
      {balanceOn === "ovr" ? (
        <Text size="eyebrow" tone="muted">
          {messages.game.played.avg(sideOvrAverage(players, locale))}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The two published teams side by side. A row shows the player's OVR, or
 * their fish in a tier Group, as Make teams does.
 */
export function TeamColumns({
  players,
  bibs,
  names,
  balanceOn,
  onOpenPlayer,
}: {
  players: readonly BoardPlayer[];
  bibs: Bibs;
  names: { slot1: string; slot2: string };
  balanceOn: FootballBalanceOn;
  onOpenPlayer?: (userId: string) => void;
}) {
  const m = useMessages().mobileTournament.card;
  const side = (index: 1 | 2) =>
    players
      .filter((player) => player.sideIndex === index)
      .sort(byKeeperThenLevel);
  const column = (index: 1 | 2) => {
    const bib = index === 1 ? bibs.slot1 : bibs.slot2;
    const members = side(index);
    return (
      <View style={{ flex: 1, gap: 8 }}>
        <TeamHeader
          bib={bib}
          name={index === 1 ? names.slot1 : names.slot2}
          players={members}
          balanceOn={balanceOn}
        />
        {members.map((player) => (
          <BibRow
            key={player.userId}
            player={player}
            bib={bib}
            showTier={balanceOn === "tierPoints"}
            balanceOn={balanceOn}
            onPress={
              onOpenPlayer ? () => onOpenPlayer(player.userId) : undefined
            }
          />
        ))}
      </View>
    );
  };
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {column(1)}
      <View style={{ paddingTop: 30 }}>
        <Text size="eyebrow" tone="muted">
          {m.vs}
        </Text>
      </View>
      {column(2)}
    </View>
  );
}
