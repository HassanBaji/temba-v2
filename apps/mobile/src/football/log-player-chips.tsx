import { radii, spacing } from "@repo/design-tokens";
import { shortName, type BoardPlayer } from "@repo/domain/football-board";
import {
  LOG_MODES,
  kindKey,
  playerChipSpoken,
  playerTally,
  type MatchLogKind,
  type MatchLogLine,
} from "@repo/domain/football-match-log";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { CardShape, LogGlyph } from "./log-glyph";

const MODE_HEIGHT = 52;
const BADGE = 18;
const SENT_OFF_OPACITY = 0.45;

function ModeButton({
  kind,
  selected,
  onPress,
}: {
  kind: MatchLogKind;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const label = useMessages().football.matchLog.modes[kindKey(kind)];
  const ink = selected ? colors.onControl : colors.ink;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: MODE_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        paddingHorizontal: 4,
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: selected ? colors.controlEdge : colors.rule,
        backgroundColor: selected ? colors.control : colors.paper,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <LogGlyph kind={kind} color={ink} />
      <Text
        size="eyebrow"
        weight="semibold"
        numberOfLines={1}
        style={{ color: ink }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function GoalBadge({ goals }: { goals: number }) {
  const colors = useColors();
  return (
    <View
      style={{
        minWidth: BADGE,
        height: BADGE,
        borderRadius: BADGE / 2,
        paddingHorizontal: 4,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.control,
      }}
    >
      <Text
        size="eyebrow"
        weight="semibold"
        style={{ color: colors.onControl }}
      >
        {String(goals)}
      </Text>
    </View>
  );
}

function LogPlayerChip({
  player,
  team,
  lines,
  hint,
  onPress,
}: {
  player: BoardPlayer;
  team: string;
  lines: readonly MatchLogLine[];
  hint: string;
  onPress: () => void;
}) {
  const messages = useMessages();
  const locale = useLocale();
  const colors = useColors();
  const tally = playerTally(lines, player.userId);
  const name = player.isViewer ? messages.common.you : shortName(player.name);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playerChipSpoken(player, team, lines, locale)}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 4,
        paddingStart: 4,
        paddingEnd: 10,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: colors.rule,
        backgroundColor: colors.paper,
        opacity: pressed ? 0.8 : tally.sentOff ? SENT_OFF_OPACITY : 1,
      })}
    >
      <Avatar
        name={player.name}
        uri={player.image}
        size="sm"
        guest={player.guest === true}
      />
      <Text size="meta" weight="semibold">
        {name}
      </Text>
      <Text size="eyebrow" tone="muted">
        {team}
      </Text>
      {tally.goals > 0 ? <GoalBadge goals={tally.goals} /> : null}
      {tally.warnings > 0 ? <CardShape kind="warning" /> : null}
      {tally.sentOff ? <CardShape kind="red_card" /> : null}
    </Pressable>
  );
}

/**
 * What happened: one choice of what the next tap records, then every player
 * of both sides. Tapping a player logs that choice for them.
 */
export function WhatHappenedSurface({
  mode,
  players,
  names,
  lines,
  onMode,
  onTapPlayer,
}: {
  mode: MatchLogKind;
  players: readonly BoardPlayer[];
  names: { slot1: string; slot2: string };
  lines: readonly MatchLogLine[];
  onMode: (mode: MatchLogKind) => void;
  onTapPlayer: (player: BoardPlayer) => void;
}) {
  const m = useMessages().football.matchLog;
  const hint = m.hints[kindKey(mode)];
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          padding: spacing.surface,
          paddingBottom: 12,
        }}
      >
        <Text tone="muted" accessibilityRole="header">
          {m.whatHappened}
        </Text>
        <Text
          size="meta"
          tone="muted"
          accessibilityLiveRegion="polite"
          style={{ flexShrink: 1, textAlign: "right" }}
        >
          {hint}
        </Text>
      </View>
      <Hairline />
      <View style={{ padding: spacing.surface, gap: 12 }}>
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: "row", gap: 6 }}
        >
          {LOG_MODES.map((choice) => (
            <ModeButton
              key={choice.key}
              kind={choice.kind}
              selected={mode === choice.kind}
              onPress={() => onMode(choice.kind)}
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {players.map((player) => (
            <LogPlayerChip
              key={player.userId}
              player={player}
              team={player.sideIndex === 1 ? names.slot1 : names.slot2}
              lines={lines}
              hint={hint}
              onPress={() => onTapPlayer(player)}
            />
          ))}
        </View>
      </View>
      <Hairline />
      <View style={{ padding: spacing.surface }}>
        <Text size="meta" tone="muted">
          {m.entryNote}
        </Text>
      </View>
    </Surface>
  );
}
