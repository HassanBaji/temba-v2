"use client";

import { type BoardPlayer } from "@repo/domain/football-board";
import {
  cardCounts,
  chronological,
  kindKey,
  logLineName,
  runningScores,
  sentOffLines,
  type MatchLogLine,
} from "@repo/domain/football-match-log";
import * as React from "react";

import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

import { CardMark, LogGlyph, scoreDash } from "./football-log-parts";

type Names = { slot1: string; slot2: string };

/**
 * The Match log as a timeline: the minute in the middle, the first side's
 * lines at the start and the second side's at the end. An own goal sits on
 * the side it counted for.
 */
export function MatchTimeline({
  lines,
  players,
  names,
}: {
  lines: readonly MatchLogLine[];
  players: readonly BoardPlayer[];
  names: Names;
}) {
  const locale = useLocale();
  const t = useMessages().football.matchLog;
  const scores = runningScores(lines);
  return (
    <ol aria-label={t.title}>
      {chronological(lines).map((line) => {
        const score = scores.get(line.id);
        const name = logLineName(line, players, locale);
        const sub = score ? scoreDash(score) : t.kind[kindKey(line.kind)];
        const start = line.side === 1;
        const event = (
          <span
            className={cn(
              "flex min-w-0 items-center gap-2.5",
              start ? "justify-end text-end" : "justify-start",
            )}
          >
            {start ? null : <LogGlyph kind={line.kind} />}
            <span className="min-w-0">
              <span className="text-meta block font-semibold">
                {name}
                {line.kind === "own_goal" ? ` (${t.ownGoalTag})` : null}
              </span>
              <span className="text-muted-foreground block text-[11px]">
                {sub}
              </span>
            </span>
            {start ? <LogGlyph kind={line.kind} /> : null}
          </span>
        );
        return (
          <li
            key={line.id}
            aria-label={`${t.minuteSpoken(line.minute)}. ${t.playerOfTeam(name, start ? names.slot1 : names.slot2)}. ${t.kind[kindKey(line.kind)]}${score ? `. ${scoreDash(score)}` : ""}`}
            className="border-rule grid grid-cols-[1fr_48px_1fr] items-center gap-2 border-t px-4 py-2.5"
          >
            <span aria-hidden="true">{start ? event : null}</span>
            <span
              aria-hidden="true"
              className="font-expanded text-center text-[15px] tabular-nums"
            >
              {t.minute(line.minute)}
            </span>
            <span aria-hidden="true">{start ? null : event}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function CardsValue({ lines }: { lines: readonly MatchLogLine[] }) {
  const t = useMessages().football.matchLog.confirm;
  const counts = cardCounts(lines);
  return (
    <span
      aria-label={`${t.warningsSpoken(counts.warnings)}, ${t.redCardsSpoken(counts.redCards)}`}
      className="flex items-center gap-3 font-semibold tabular-nums"
    >
      <span aria-hidden="true" className="flex items-center gap-1.5">
        <CardMark kind="warning" />
        {counts.warnings}
      </span>
      <span aria-hidden="true" className="flex items-center gap-1.5">
        <CardMark kind="red_card" />
        {counts.redCards}
      </span>
    </span>
  );
}

export function sentOffValue(
  lines: readonly MatchLogLine[],
  players: readonly BoardPlayer[],
  locale: Parameters<typeof logLineName>[2],
  sentOffAt: (name: string, minute: number) => string,
) {
  const reds = sentOffLines(lines);
  return reds.length > 0
    ? reds
        .map((line) =>
          sentOffAt(logLineName(line, players, locale), line.minute),
        )
        .join(" · ")
    : null;
}

export function LogSummaryRows({
  rows,
}: {
  rows: readonly { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="divide-rule border-rule divide-y overflow-hidden rounded-xl border">
      {rows.map((row) => (
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
  const locale = useLocale();
  const m = useMessages();
  const t = m.football.matchLog;
  const separator = m.tournament.listSeparator;
  const scorers = [
    ...new Set(
      chronological(lines)
        .filter((line) => line.kind === "goal" && line.userId)
        .map((line) => logLineName(line, players, locale)),
    ),
  ];
  const ownGoals = [
    ...new Set(
      lines
        .filter((line) => line.kind === "own_goal")
        .map((line) => logLineName(line, players, locale)),
    ),
  ];
  const counts = cardCounts(lines);
  const sentOff = sentOffValue(lines, players, locale, t.confirm.sentOffAt);
  const rows = [
    scorers.length > 0
      ? { label: t.confirm.scorers, value: scorers.join(separator) }
      : null,
    ownGoals.length > 0
      ? { label: t.confirm.ownGoals, value: ownGoals.join(separator) }
      : null,
    counts.warnings + counts.redCards > 0
      ? { label: t.confirm.cards, value: <CardsValue lines={lines} /> }
      : null,
    sentOff ? { label: t.confirm.sentOff, value: sentOff } : null,
    confirmedByName
      ? { label: t.confirm.confirmedBy, value: confirmedByName }
      : null,
  ].filter((row) => row != null);
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
        <MatchTimeline lines={lines} players={players} names={names} />
      </div>
      {rows.length > 0 ? (
        <div className="px-5">
          <LogSummaryRows rows={rows} />
        </div>
      ) : null}
      <p className="text-muted-foreground px-5 text-[12px] leading-normal">
        {t.confirm.sidesNote(names.slot1, names.slot2)}
      </p>
    </section>
  );
}
