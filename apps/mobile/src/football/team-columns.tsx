import { bibColors, radii } from "@repo/design-tokens";
import { type FootballBib } from "@repo/domain/football-lineup";
import { Pressable, View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { BibChip } from "./bib-picker";
import {
  byKeeperThenLevel,
  levelLabel,
  shortName,
  sideAverage,
  slotCode,
  type Bibs,
  type BoardPlayer,
} from "./football-model";

const ROW_HEIGHT = 44;

/** A player row in their team's bib colour; the viewer's row is ringed. */
export function BibRow({
  player,
  bib,
  trailing,
  onPress,
}: {
  player: BoardPlayer;
  bib: FootballBib;
  trailing?: React.ReactNode;
  onPress?: () => void;
}) {
  const palette = useTonePalette();
  const { fill, on } = bibColors[bib];
  const edge = fill === palette.background ? palette.muted : fill;
  const name = player.isViewer ? "You" : shortName(player.name);
  const code = slotCode(player);
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={[name, code, levelLabel(player.levelBand)]
        .filter(Boolean)
        .join(", ")}
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
      <Text size="meta" width="expanded" weight="bold" style={{ color: on }}>
        {levelLabel(player.levelBand)}
      </Text>
      {trailing}
    </Pressable>
  );
}

export function TeamHeader({
  bib,
  name,
  players,
}: {
  bib: FootballBib;
  name: string;
  players: readonly BoardPlayer[];
}) {
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
      <Text size="eyebrow" tone="muted">
        avg {sideAverage(players)}
      </Text>
    </View>
  );
}

/** The two published teams side by side. */
export function TeamColumns({
  players,
  bibs,
  names,
  onOpenPlayer,
}: {
  players: readonly BoardPlayer[];
  bibs: Bibs;
  names: { slot1: string; slot2: string };
  onOpenPlayer?: (userId: string) => void;
}) {
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
        />
        {members.map((player) => (
          <BibRow
            key={player.userId}
            player={player}
            bib={bib}
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
          vs
        </Text>
      </View>
      {column(2)}
    </View>
  );
}
