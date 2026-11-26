import { spacing } from "@repo/design-tokens";
import type { BoardPlayer, Side } from "@repo/domain/football-board";
import {
  chronological,
  logFacts,
  logLineName,
  logScoreLabel,
  runningScores,
  timelineLineSpoken,
  type MatchLogLine,
} from "@repo/domain/football-match-log";
import { Fragment } from "react";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";
import { CardShape, LogGlyph } from "./log-glyph";

const MINUTE_COLUMN = 44;

type TimelinePlayer = Pick<BoardPlayer, "userId" | "name" | "isViewer">;

function TimelineLine({
  line,
  side,
  score,
  players,
}: {
  line: MatchLogLine;
  side: Side;
  score: { slot1: number; slot2: number } | undefined;
  players: readonly TimelinePlayer[];
}) {
  const locale = useLocale();
  const m = useMessages().football.matchLog;
  const start = side === 1;
  const sub =
    line.kind === "warning"
      ? m.kind.warning
      : line.kind === "red_card"
        ? m.kind.redCard
        : score
          ? logScoreLabel(score)
          : null;
  return (
    <View
      style={{
        flexDirection: start ? "row-reverse" : "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      <LogGlyph kind={line.kind} />
      <View
        style={{
          flexShrink: 1,
          alignItems: start ? "flex-end" : "flex-start",
        }}
      >
        <Text
          size="meta"
          weight="semibold"
          style={{ textAlign: start ? "right" : "left" }}
        >
          {logLineName(line, players, locale)}
        </Text>
        {line.kind === "own_goal" ? (
          <Text size="eyebrow" weight="semibold">
            {m.ownGoalTag}
          </Text>
        ) : null}
        {sub ? (
          <Text size="eyebrow" tone="muted" ltr={score != null}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * The Match log as a timeline, oldest first: the minute in the middle, the
 * first side's lines at the start and the second side's at the end. An own
 * goal sits on the side it counted for.
 */
export function MatchTimeline({
  lines,
  players,
  inset = spacing.surface,
}: {
  lines: readonly MatchLogLine[];
  players: readonly TimelinePlayer[];
  inset?: number;
}) {
  const locale = useLocale();
  const m = useMessages().football.matchLog;
  const scores = runningScores(lines);
  return (
    <View>
      {chronological(lines).map((line, index) => {
        const score = scores.get(line.id);
        const entry = (
          <TimelineLine
            line={line}
            side={line.side}
            score={score}
            players={players}
          />
        );
        return (
          <Fragment key={line.id}>
            {index > 0 ? <Hairline /> : null}
            <View
              accessible
              accessibilityLabel={timelineLineSpoken(
                line,
                score,
                players,
                locale,
              )}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                paddingHorizontal: inset,
                gap: 10,
              }}
            >
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                {line.side === 1 ? entry : null}
              </View>
              <View style={{ width: MINUTE_COLUMN, alignItems: "center" }}>
                <Text weight="bold" width="expanded">
                  {m.minute(line.minute)}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: "flex-start" }}>
                {line.side === 2 ? entry : null}
              </View>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

export type LogFact = {
  label: string;
  value: React.ReactNode;
  spoken: string;
};

/** Label and value rows under the timeline, split by hairlines. */
export function LogFacts({
  facts,
  inset = spacing.surface,
}: {
  facts: readonly LogFact[];
  inset?: number;
}) {
  const m = useMessages().mobileTournament;
  return (
    <View>
      {facts.map((fact, index) => (
        <Fragment key={fact.label}>
          {index > 0 ? <Hairline /> : null}
          <View
            accessible
            accessibilityLabel={m.infoRow(fact.label, fact.spoken)}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              paddingHorizontal: inset,
              paddingVertical: 12,
            }}
          >
            <Text tone="muted">{fact.label}</Text>
            {typeof fact.value === "string" ? (
              <Text
                weight="semibold"
                style={{ flexShrink: 1, textAlign: "right" }}
              >
                {fact.value}
              </Text>
            ) : (
              fact.value
            )}
          </View>
        </Fragment>
      ))}
    </View>
  );
}

function CardCount({
  kind,
  count,
}: {
  kind: "warning" | "red_card";
  count: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <CardShape kind={kind} />
      <Text weight="semibold">{String(count)}</Text>
    </View>
  );
}

/**
 * The facts a log adds under its timeline. Each row shows only when the log
 * has something for it.
 */
export function useLogFacts(
  lines: readonly MatchLogLine[],
  players: readonly TimelinePlayer[],
) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.matchLog.confirm;
  const separator = messages.common.listSeparator;
  const facts = logFacts(lines, players, locale);
  const cards: LogFact | null =
    facts.cards.warnings + facts.cards.redCards > 0
      ? {
          label: m.cards,
          value: (
            <View style={{ flexDirection: "row", gap: 14 }}>
              <CardCount kind="warning" count={facts.cards.warnings} />
              <CardCount kind="red_card" count={facts.cards.redCards} />
            </View>
          ),
          spoken: facts.cardsSpoken,
        }
      : null;
  const text = (label: string, values: readonly string[]): LogFact | null =>
    values.length > 0
      ? {
          label,
          value: values.join(separator),
          spoken: values.join(separator),
        }
      : null;
  return {
    cards,
    scorers: text(m.scorers, facts.scorers),
    ownGoals: text(m.ownGoals, facts.ownGoals),
    sentOff: text(m.sentOff, facts.sentOff),
    row: (label: string, value: string | null) =>
      value ? text(label, [value]) : null,
  };
}

export function presentFacts(facts: readonly (LogFact | null)[]) {
  return facts.filter((fact): fact is LogFact => fact != null);
}
