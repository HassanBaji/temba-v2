import { bibColors, radii, sizes } from "@repo/design-tokens";
import type { FishSize } from "@repo/design-tokens/fish";
import {
  type FootballBalanceOn,
  type FootballBib,
} from "@repo/domain/football-lineup";
import type { GroupMemberTierCell } from "@repo/domain/group-members-table";
import { Pressable, View } from "react-native";

import { NicknameName } from "../primitives/nickname-name";
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
  lineupName,
  ovrLabel,
  ovrSpoken,
  sideOvrAverage,
  slotCode,
  type Bibs,
  type BoardPlayer,
  type SideCaptains,
} from "@repo/domain/football-board";

const ROW_HEIGHT = 44;
const CAPTAIN_BADGE = 16;

/**
 * The C on a Side captain's picture (ADR-0108), in the row's colours turned
 * round so it reads on any bib.
 */
export function SideCaptainBadge({ bib }: { bib: FootballBib | null }) {
  const colors = useColors();
  const m = useMessages().football.captains;
  const fill = bib ? bibColors[bib].on : colors.control;
  const on = bib ? bibColors[bib].fill : colors.onControl;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute",
        end: -5,
        bottom: -4,
        width: CAPTAIN_BADGE,
        height: CAPTAIN_BADGE,
        borderRadius: radii.sm,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: fill,
        borderWidth: hairline,
        borderColor: on,
      }}
    >
      <Text size="eyebrow" weight="semibold" style={{ color: on }}>
        {m.badge}
      </Text>
    </View>
  );
}

/** A player's picture, with the C when they are their side's captain. */
export function CaptainAvatar({
  player,
  bib,
  sideCaptain,
  size,
}: {
  player: Pick<BoardPlayer, "name" | "image" | "guest">;
  bib: FootballBib | null;
  sideCaptain: boolean;
  size?: "sm" | "default";
}) {
  return (
    <View>
      <Avatar
        name={player.name}
        uri={player.image}
        size={size}
        guest={player.guest}
      />
      {sideCaptain ? <SideCaptainBadge bib={bib} /> : null}
    </View>
  );
}

/** A player's fish on a paper tile, so it reads on any bib colour. */
export function TierMark({
  cell,
  size,
}: {
  cell: GroupMemberTierCell;
  size?: FishSize;
}) {
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
      <TierCell cell={cell} size={size} />
    </View>
  );
}

/**
 * A player row in their team's bib colour; the viewer's row is ringed and a
 * Side captain carries the C. The OVR sits at the end, or with `showTier`
 * the player's fish in a tier Group.
 */
export function BibRow({
  player,
  bib,
  trailing,
  onPress,
  showTier = false,
  sideCaptain = false,
}: {
  player: BoardPlayer;
  bib: FootballBib;
  trailing?: React.ReactNode;
  onPress?: () => void;
  showTier?: boolean;
  sideCaptain?: boolean;
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
  const { name, spoken, isNickname } = lineupName(player, locale);
  const code = slotCode(player, locale);
  const tierCell = showTier ? boardTierCell(player, locale) : null;
  const level = ovrLabel(player);
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={[
        spoken,
        sideCaptain ? messages.football.captains.spoken : null,
        code,
        tierCell ? tierCell.label : ovrSpoken(player, locale),
        player.guest ? messages.group.addPlayer.guest.tag : null,
      ]
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
      <CaptainAvatar
        player={player}
        bib={bib}
        sideCaptain={sideCaptain}
        size="sm"
      />
      <NicknameName
        name={name}
        isNickname={isNickname}
        size="meta"
        weight={player.isViewer ? "semibold" : "regular"}
        iconSize={sizes.iconRow - 4}
        color={on}
        style={{ flex: 1 }}
      />
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
 * The two teams side by side, published or a Draft line-up. A row shows the
 * player's OVR, or their fish in a tier Group, as Make teams does, and each
 * side's Side captain carries the C.
 */
export function TeamColumns({
  players,
  bibs,
  names,
  balanceOn,
  sideCaptains,
  onOpenPlayer,
}: {
  players: readonly BoardPlayer[];
  bibs: Bibs;
  names: { slot1: string; slot2: string };
  balanceOn: FootballBalanceOn;
  sideCaptains?: SideCaptains;
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
            sideCaptain={
              (index === 1 ? sideCaptains?.slot1 : sideCaptains?.slot2) ===
              player.userId
            }
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
