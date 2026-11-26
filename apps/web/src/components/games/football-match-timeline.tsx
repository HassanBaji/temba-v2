"use client";

import { type BoardPlayer } from "@repo/domain/football-board";
import {
  chronological,
  kindKey,
  logFacts,
  logLineName,
  logScoreLabel,
  runningScores,
  timelineLineSpoken,
  type MatchLogLine,
} from "@repo/domain/football-match-log";
import * as React from "react";

import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

import { CardShape, LogGlyph } from "./football-log-parts";

type Names = { slot1: string; slot2: string };

/**
 * The Match log as a timeline: the minute in the middle, the first side's
 * lines at the start and the second side's at the end. An own goal sits on
 * the side it counted for.
 */
export function MatchTimeline({
  lines,
  players,
}: {
  lines: readonly MatchLogLine[];
  players: readonly BoardPlayer[];
}) {
  const locale = useLocale();
  const t = useMessages().football.matchLog;
  const scores = runningScores(lines);
  return (
    <ol aria-label={t.title}>
      {chronological(lines).map((line) => {
        const score = scores.get(line.id);
        const name = logLineName(line, players, locale);
        const start = line.side === 1;
        const entry = (
          <span
            className={cn(
              "flex min-w-0 items-center gap-2.5",
              start ? "justify-end text-end" : "justify-start",
            )}
          >
            {start ? null : <LogGlyph kind={line.kind} />}
            <span className="min-w-0">
              <span className="text-meta block font-semibold">
                {line.kind === "own_goal" ? t.ownGoalName(name) : name}
              </span>
              <span className="text-muted-foreground block text-[11px]">
                {score ? logScoreLabel(score) : t.kind[kindKey(line.kind)]}
              </span>
            </span>
            {start ? <LogGlyph kind={line.kind} /> : null}
          </span>
        );
        return (
          <li
            key={line.id}
            aria-label={timelineLineSpoken(line, score, players, locale)}
            className="border-rule grid grid-cols-[1fr_48px_1fr] items-center gap-2 border-t px-4 py-2.5"
          >
            <span aria-hidden="true">{start ? entry : null}</span>
            <span
              aria-hidden="true"
              className="font-expanded text-center text-[15px] tabular-nums"
            >
              {t.minute(line.minute)}
            </span>
            <span aria-hidden="true">{start ? null : entry}</span>
          </li>
        );
      })}
    </ol>
  );
}

type Facts = ReturnType<typeof logFacts>;

function CardsValue({ facts }: { facts: Facts }) {
  return (
    <span
      aria-label={facts.cardsSpoken}
      className="flex items-center gap-3 font-semibold tabular-nums"
    >
      <span aria-hidden="true" className="flex items-center gap-1.5">
        <CardShape kind="warning" />
        {facts.cards.warnings}
      </span>
      <span aria-hidden="true" className="flex items-center gap-1.5">
        <CardShape kind="red_card" />
        {facts.cards.redCards}
      </span>
    </span>
  );
}

type Row = { label: string; value: React.ReactNode };

/** The rows a log adds under its timeline; each shows only when the log has something for it. */
export function useLogRows(
  lines: readonly MatchLogLine[],
  players: readonly BoardPlayer[],
) {
  const locale = useLocale();
  const m = useMessages();
  const t = m.football.matchLog.confirm;
  const facts = logFacts(lines, players, locale);
  const list = (label: string, values: readonly string[]): Row | null =>
    values.length > 0
      ? { label, value: values.join(m.common.listSeparator) }
      : null;
  return {
    scorers: list(t.scorers, facts.scorers),
    ownGoals: list(t.ownGoals, facts.ownGoals),
    sentOff: list(t.sentOff, facts.sentOff),
    cards:
      facts.cards.warnings + facts.cards.redCards > 0
        ? { label: t.cards, value: <CardsValue facts={facts} /> }
        : null,
    named: (label: string, name: string | null): Row | null =>
      name ? { label, value: name } : null,
  };
}

export function LogSummaryRows({ rows }: { rows: readonly (Row | null)[] }) {
  const shown = rows.filter((row) => row != null);
  if (shown.length === 0) {
    return null;
  }
  return (
    <dl className="divide-rule border-rule divide-y overflow-hidden rounded-xl border">
      {shown.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <dt className="text-muted-foreground text-meta">{row.label}</dt>
          <dd className="text-meta text-end font-semibold">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The finished Game's log, for everyone in it once the Score is confirmed. */
export function FootballMatchLogCard({
  lines,
  players,
  names,
  confirmedByName,
}: {
  lines: readonly MatchLogLine[];
  players: readonly BoardPlayer[];
  names: Names;
  confirmedByName: string | null;
}) {
  const t = useMessages().football.matchLog;
  const rows = useLogRows(lines, players);
  return (
    <section
      aria-labelledby="football-match-log-heading"
      className="border-rule bg-paper space-y-4 overflow-hidden rounded-xl border pb-5"
    >
      <div>
        <h2
          id="football-match-log-heading"
          className="text-muted-foreground px-5 pb-3 pt-5"
        >
          {t.title}
        </h2>
        <MatchTimeline lines={lines} players={players} />
      </div>
      <div className="px-5">
        <LogSummaryRows
          rows={[
            rows.scorers,
            rows.ownGoals,
            rows.cards,
            rows.named(t.confirm.confirmedBy, confirmedByName),
          ]}
        />
      </div>
      <p className="text-muted-foreground px-5 text-[12px] leading-normal">
        {t.confirm.sidesNote(names.slot1, names.slot2)}
      </p>
    </section>
  );
}
