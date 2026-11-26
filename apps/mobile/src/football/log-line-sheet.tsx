import { radii } from "@repo/design-tokens";
import {
  ofSide,
  shortName,
  type BoardPlayer,
} from "@repo/domain/football-board";
import { formatGameClock } from "@repo/domain/format-game-start";
import {
  MATCH_LOG_MINUTE_MAX,
  MATCH_LOG_MINUTE_MIN,
  isGoalLine,
  logLineSub,
  otherSide,
  type LogPlayer,
  type MatchLogLine,
  type RedCardReason,
} from "@repo/domain/football-match-log";
import { Minus, Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { ReasonChips } from "./red-card-sheet";

type Names = { slot1: string; slot2: string };

function PickChip({
  player,
  selected,
  onPress,
}: {
  player: BoardPlayer;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const messages = useMessages();
  const name = player.isViewer ? messages.common.you : shortName(player.name);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={player.isViewer ? messages.common.you : player.name}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 4,
        paddingStart: 4,
        paddingEnd: 12,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: selected ? colors.controlEdge : colors.rule,
        backgroundColor: selected ? colors.control : colors.sheet,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Avatar
        name={player.name}
        uri={player.image}
        size="sm"
        guest={player.guest === true}
      />
      <Text
        size="meta"
        weight="semibold"
        style={{ color: selected ? colors.onControl : colors.ink }}
      >
        {name}
      </Text>
    </Pressable>
  );
}

function PlayerGroup({
  label,
  players,
  selectedId,
  onPick,
}: {
  label: string;
  players: readonly BoardPlayer[];
  selectedId: string | null;
  onPick: (player: LogPlayer) => void;
}) {
  if (players.length === 0) {
    return null;
  }
  return (
    <View style={{ gap: 8 }}>
      <Text size="meta" tone="muted">
        {label}
      </Text>
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
      >
        {players.map((player) => (
          <PickChip
            key={player.userId}
            player={player}
            selected={player.userId === selectedId}
            onPress={() => onPick(player)}
          />
        ))}
      </View>
    </View>
  );
}

function MinuteStepper({
  minute,
  onChange,
}: {
  minute: number;
  onChange: (minute: number) => void;
}) {
  const colors = useColors();
  const m = useMessages().football.matchLog;
  const step = (label: string, delta: -1 | 1, disabled: boolean) => {
    const Icon = delta > 0 ? Plus : Minus;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => onChange(minute + delta)}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: radii.md,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: hairline,
          borderColor: colors.inputBorder,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        })}
      >
        <Icon size={18} color={colors.ink} />
      </Pressable>
    );
  };
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text size="meta" tone="muted" style={{ flexShrink: 1 }}>
        {m.editSheet.minuteLabel}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {step(m.editSheet.earlier, -1, minute <= MATCH_LOG_MINUTE_MIN)}
        <Text
          size="title"
          width="expanded"
          weight="bold"
          accessibilityLabel={m.minuteSpoken(minute)}
          accessibilityLiveRegion="polite"
        >
          {m.minute(minute)}
        </Text>
        {step(m.editSheet.later, 1, minute >= MATCH_LOG_MINUTE_MAX)}
      </View>
    </View>
  );
}

/**
 * Changes one log line. A goal opens on who scored, the other side under it
 * in case it was an own goal; a card names its player, and a red card its
 * reason. Either way the minute can move and the line can go.
 */
export function LogLineSheet({
  line,
  players,
  names,
  onClose,
  onChangePlayer,
  onChangeMinute,
  onChangeReason,
  onRemove,
}: {
  line: MatchLogLine | null;
  players: readonly BoardPlayer[];
  names: Names;
  onClose: () => void;
  onChangePlayer: (id: string, player: LogPlayer) => void;
  onChangeMinute: (id: string, minute: number) => void;
  onChangeReason: (id: string, reason: RedCardReason | null) => void;
  onRemove: (id: string) => void;
}) {
  const locale = useLocale();
  const m = useMessages().football.matchLog;
  const goal = line ? isGoalLine(line) : false;
  const sideOf = (side: 1 | 2) =>
    players.filter((player) => player.sideIndex === side);

  return (
    <Sheet
      visible={line != null}
      onClose={onClose}
      tall
      title={
        line ? (goal ? m.scorerSheet.title : m.editSheet.title) : undefined
      }
      subtitle={
        line
          ? goal
            ? m.scorerSheet.what(
                ofSide(names, line.side),
                line.minute,
                formatGameClock(line.loggedAt, locale),
              )
            : logLineSub(line, names, locale)
          : null
      }
      footer={<Button label={m.editSheet.done} size="lg" onPress={onClose} />}
    >
      {line ? (
        <View style={{ gap: 18 }}>
          {goal ? (
            <>
              <PlayerGroup
                label={ofSide(names, line.side)}
                players={sideOf(line.side)}
                selectedId={line.kind === "goal" ? line.userId : null}
                onPick={(player) => onChangePlayer(line.id, player)}
              />
              <PlayerGroup
                label={m.scorerSheet.ownGoalBy(
                  ofSide(names, otherSide(line.side)),
                )}
                players={sideOf(otherSide(line.side))}
                selectedId={line.kind === "own_goal" ? line.userId : null}
                onPick={(player) => onChangePlayer(line.id, player)}
              />
            </>
          ) : (
            <View style={{ gap: 12 }}>
              <Text weight="semibold">{m.editSheet.who}</Text>
              {([1, 2] as const).map((side) => (
                <PlayerGroup
                  key={side}
                  label={ofSide(names, side)}
                  players={sideOf(side)}
                  selectedId={line.userId}
                  onPick={(player) => onChangePlayer(line.id, player)}
                />
              ))}
            </View>
          )}
          <MinuteStepper
            minute={line.minute}
            onChange={(minute) => onChangeMinute(line.id, minute)}
          />
          {line.kind === "red_card" ? (
            <ReasonChips
              reason={line.reason}
              onChange={(reason) => onChangeReason(line.id, reason)}
            />
          ) : null}
          {goal ? (
            <Text size="meta" tone="muted">
              {m.scorerSheet.note}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row" }}>
            <Button
              label={m.editSheet.remove}
              variant="outline"
              onPress={() => onRemove(line.id)}
            />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}
