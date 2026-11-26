import { radii, sizes, spacing } from "@repo/design-tokens";
import type { BoardPlayer } from "@repo/domain/football-board";
import { formatGameClock } from "@repo/domain/format-game-start";
import {
  logLineName,
  logLineSub,
  newestFirst,
  removedLabel,
  runningScores,
  type MatchLogLine,
} from "@repo/domain/football-match-log";
import { Plus, X } from "lucide-react-native";
import { Fragment } from "react";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { LogGlyph, scoreDash } from "./log-glyph";

const MINUTE_COLUMN = 56;
const GLYPH_COLUMN = 18;
const REMOVE = 36;
const EMPTY_HEIGHT = 72;

type Names = { slot1: string; slot2: string };

function AddScorerTag() {
  const colors = useColors();
  const m = useMessages().football.matchLog;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radii.sm,
        borderWidth: hairline,
        borderColor: colors.inputBorder,
      }}
    >
      <Plus size={12} color={colors.ink} />
      <Text size="eyebrow" weight="semibold">
        {m.addScorer}
      </Text>
    </View>
  );
}

function LogRow({
  line,
  score,
  players,
  names,
  onOpen,
  onRemove,
}: {
  line: MatchLogLine;
  score: { slot1: number; slot2: number } | undefined;
  players: readonly BoardPlayer[];
  names: Names;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.matchLog;
  const name = logLineName(line, players, locale);
  const sub = logLineSub(line, names, locale);
  const what = [m.minuteSpoken(line.minute), name, sub].join(
    messages.common.listSeparator,
  );
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingStart: spacing.surface,
        paddingEnd: 12,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={m.editLine(what)}
        onPress={onOpen}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ width: MINUTE_COLUMN }}>
          <Text size="lead" width="expanded" weight="bold">
            {m.minute(line.minute)}
          </Text>
          <Text size="eyebrow" tone="muted">
            {formatGameClock(line.loggedAt, locale)}
          </Text>
        </View>
        <View style={{ width: GLYPH_COLUMN, alignItems: "center" }}>
          <LogGlyph kind={line.kind} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold" numberOfLines={1}>
            {name}
          </Text>
          <Text size="eyebrow" tone="muted">
            {sub}
          </Text>
          {line.kind === "goal" && line.userId == null ? (
            <AddScorerTag />
          ) : null}
        </View>
        {score ? (
          <Text weight="bold" ltr>
            {scoreDash(score)}
          </Text>
        ) : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={m.removeLine(what)}
        hitSlop={(sizes.touchTarget - REMOVE) / 2}
        onPress={onRemove}
        style={({ pressed }) => ({
          width: REMOVE,
          height: REMOVE,
          borderRadius: radii.md,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: hairline,
          borderColor: colors.inputBorder,
          backgroundColor: colors.paper,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <X size={sizes.iconRow} color={colors.ink} />
      </Pressable>
    </View>
  );
}

function UndoBar({
  removed,
  players,
  names,
  onUndo,
}: {
  removed: MatchLogLine;
  players: readonly BoardPlayer[];
  names: Names;
  onUndo: () => void;
}) {
  const colors = useColors();
  const locale = useLocale();
  const m = useMessages().football.matchLog;
  const name = removed.userId ? logLineName(removed, players, locale) : null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingStart: spacing.surface,
        paddingEnd: 12,
        paddingVertical: 8,
        backgroundColor: colors.wash,
      }}
    >
      <Text
        size="meta"
        accessibilityLiveRegion="polite"
        style={{ flexShrink: 1 }}
      >
        {removedLabel(removed, name, names, locale)}
      </Text>
      <Button label={m.undo} size="sm" onPress={onUndo} />
    </View>
  );
}

function EmptyLog() {
  const m = useMessages().football.matchLog;
  return (
    <View style={{ padding: spacing.surface }}>
      <View
        style={{
          height: EMPTY_HEIGHT,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Hatch radius={radii.md} />
        <Text size="meta" tone="muted">
          {m.empty}
        </Text>
      </View>
    </View>
  );
}

/**
 * The Match log being entered, newest first. Each line can be opened to
 * change it or crossed out; Undo brings back what the last cross took out.
 */
export function MatchLogSurface({
  lines,
  removed,
  players,
  names,
  onOpen,
  onRemove,
  onUndo,
}: {
  lines: readonly MatchLogLine[];
  removed: readonly MatchLogLine[];
  players: readonly BoardPlayer[];
  names: Names;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onUndo: () => void;
}) {
  const m = useMessages().football.matchLog;
  const scores = runningScores(lines);
  const firstRemoved = removed[0];
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
          {m.title}
        </Text>
        <Text size="meta" tone="muted">
          {m.lineCount(lines.length)}
        </Text>
      </View>
      <Hairline />
      {firstRemoved ? (
        <>
          <UndoBar
            removed={firstRemoved}
            players={players}
            names={names}
            onUndo={onUndo}
          />
          <Hairline />
        </>
      ) : null}
      {lines.length === 0 ? (
        <EmptyLog />
      ) : (
        newestFirst(lines).map((line, index) => (
          <Fragment key={line.id}>
            {index > 0 ? <Hairline /> : null}
            <LogRow
              line={line}
              score={scores.get(line.id)}
              players={players}
              names={names}
              onOpen={() => onOpen(line.id)}
              onRemove={() => onRemove(line.id)}
            />
          </Fragment>
        ))
      )}
      <Hairline />
      <View style={{ padding: spacing.surface }}>
        <Text size="meta" tone="muted">
          {m.logNote}
        </Text>
      </View>
    </Surface>
  );
}
