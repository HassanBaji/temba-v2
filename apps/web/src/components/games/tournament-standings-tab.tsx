"use client";

import * as React from "react";

import { formatGameClock } from "@repo/domain/format-game-start";
import type { TournamentFinishedView } from "@repo/domain/tournament-finished";
import { defaultStandingsPoolIndex } from "@repo/domain/tournament-home";
import { resolveQualifiersPerPool } from "@repo/domain/tournament-sizing";

import {
  ResultMark,
  type ResultMarkVariant,
} from "~/components/temba/result-mark";
import { ScoreText } from "~/components/temba/score-text";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";
import { type ComputedPoolTables } from "@repo/domain/pool-table";

import { PlaceChip } from "./tournament-finished-parts";
import {
  ROUND_CARD,
  TeamMark,
  TeamNames,
  type RoundsMatch,
  type RoundsTeam,
  type TournamentRoundsData,
} from "./tournament-round-parts";
import { type ScoreSheetTarget } from "./tournament-score-drawer";

type PoolTables = ComputedPoolTables;
type PoolRow = PoolTables["pools"][number]["rows"][number];

const STAT = "w-8 px-0 text-center tabular-nums";

function statValue(value: number | null) {
  return value ?? 0;
}

function PoolTable({
  rows,
  poolFinished,
  dayOver,
  qualifiers,
  teams,
  viewerUserId,
}: {
  rows: PoolRow[];
  poolFinished: boolean;
  /** The whole day is over: rank 1 is marked and P drops out. */
  dayOver: boolean;
  qualifiers: number | null;
  teams: ReadonlyMap<string, RoundsTeam>;
  viewerUserId: string;
}) {
  const messages = useMessages().tournamentRounds;
  const m = messages.standings;
  const anyPlayed = rows.some((row) => row.played != null);
  const stats = (row: PoolRow) =>
    dayOver
      ? [row.won, row.drawn, row.lost]
      : [row.played, row.won, row.drawn, row.lost];
  return (
    <div>
      <div className={ROUND_CARD}>
        <table className="w-full table-fixed">
          <thead>
            <tr className="text-eyebrow text-muted-foreground border-rule border-b">
              <th scope="col" className="w-9 py-3 ps-4 text-start font-normal">
                #
              </th>
              <th scope="col" className="px-2 py-3 text-start font-normal">
                {m.team}
              </th>
              {dayOver ? null : (
                <th scope="col" className={cn(STAT, "font-normal")}>
                  <abbr title={m.playedLong} className="no-underline">
                    {m.played}
                  </abbr>
                </th>
              )}
              <th scope="col" className={cn(STAT, "font-normal")}>
                <abbr title={m.wonLong} className="no-underline">
                  {m.won}
                </abbr>
              </th>
              <th scope="col" className={cn(STAT, "font-normal")}>
                <abbr title={m.drawnLong} className="no-underline">
                  {m.drawn}
                </abbr>
              </th>
              <th scope="col" className={cn(STAT, "font-normal")}>
                <abbr title={m.lostLong} className="no-underline">
                  {m.lost}
                </abbr>
              </th>
              <th scope="col" className={cn(STAT, "w-11 pe-4 font-normal")}>
                <abbr title={m.pointsLong} className="no-underline">
                  {m.points}
                </abbr>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const team = teams.get(row.gameTeamId);
              const unplayed = row.played == null;
              const lineAfter =
                qualifiers != null &&
                index === qualifiers - 1 &&
                index < rows.length - 1;
              return (
                <React.Fragment key={row.gameTeamId}>
                  <tr
                    className={cn(
                      "border-rule border-t first:border-t-0",
                      row.isViewer && "bg-wash",
                    )}
                  >
                    <td className="text-muted-foreground text-meta py-3 ps-4 tabular-nums">
                      {dayOver && row.position === 1 ? (
                        <>
                          <PlaceChip place={1} />
                          <span className="sr-only">{row.position}</span>
                        </>
                      ) : (
                        row.position
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <TeamMark team={team} isViewer={row.isViewer} />
                        <TeamNames team={team} viewerUserId={viewerUserId} />
                      </span>
                      {poolFinished && row.isWinner && !dayOver ? (
                        <span className="text-meta text-muted-foreground ms-[46px] block">
                          {m.winner}
                        </span>
                      ) : null}
                    </td>
                    {stats(row).map((value, cell) => (
                      <td
                        key={cell}
                        className={cn(
                          STAT,
                          "text-meta py-3",
                          unplayed && "text-muted-foreground",
                        )}
                      >
                        {statValue(value)}
                      </td>
                    ))}
                    <td
                      className={cn(
                        STAT,
                        "font-expanded w-11 py-3 pe-4 text-[16px]",
                        unplayed && "text-muted-foreground",
                      )}
                    >
                      {statValue(row.points)}
                    </td>
                  </tr>
                  {lineAfter ? (
                    <tr aria-hidden="true">
                      <td colSpan={dayOver ? 6 : 7} className="px-4 py-0">
                        <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
                          <span className="border-rule flex-1 border-t border-dashed" />
                          {m.throughLine}
                          <span className="border-rule flex-1 border-t border-dashed" />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-meta mt-2.5 leading-relaxed">
        {dayOver
          ? messages.finished.finalNote(m.ties)
          : anyPlayed
            ? m.ties
            : m.drawOrder}
      </p>
    </div>
  );
}

function yourRoundLine(
  roundNumber: number,
  match: RoundsMatch,
  viewerSlot: 1 | 2,
  m: ReturnType<typeof useMessages>["tournamentRounds"]["yourRounds"],
  locale: Parameters<typeof formatGameClock>[1],
): { line: string; mark: ResultMarkVariant; score: string | null } {
  const mine = viewerSlot === 1 ? match.slot1GamesWon : match.slot2GamesWon;
  const theirs = viewerSlot === 1 ? match.slot2GamesWon : match.slot1GamesWon;
  const score = mine != null && theirs != null ? `${mine}–${theirs}` : null;
  if (match.state === "confirmed" && mine != null && theirs != null) {
    if (mine === theirs) {
      return { line: m.drawn(roundNumber), mark: "draw", score };
    }
    return mine > theirs
      ? { line: m.won(roundNumber), mark: "won", score }
      : { line: m.lost(roundNumber), mark: "lost", score };
  }
  if (match.state === "awaiting_confirmation") {
    return { line: m.waiting(roundNumber), mark: "not-played", score };
  }
  if (match.state === "not_finished") {
    return {
      line: m.notFinished(roundNumber),
      mark: "not-played",
      score: null,
    };
  }
  if (match.state === "on_court") {
    return {
      line: m.onCourt(roundNumber, match.courtName ?? ""),
      mark: "not-played",
      score: null,
    };
  }
  return {
    line: m.at(
      roundNumber,
      match.startTime ? formatGameClock(match.startTime, locale) : "",
    ),
    mark: "not-played",
    score: null,
  };
}

export function TournamentYourRoundsList({
  data,
  teams,
  viewerUserId,
  onEnterScore,
  viewerDay = null,
}: {
  data: TournamentRoundsData;
  teams: ReadonlyMap<string, RoundsTeam>;
  viewerUserId: string;
  onEnterScore: (target: ScoreSheetTarget) => void;
  /** Once the day is over the heading counts games for and against. */
  viewerDay?: TournamentFinishedView["viewerDay"];
}) {
  const m = useMessages().tournamentRounds;
  const locale = useLocale();
  const viewerTeamId = data.viewerGameTeamId;
  if (!viewerTeamId) {
    return null;
  }
  const mine = data.rounds.flatMap((round) => {
    const match = round.matches.find(
      (item) =>
        item.matchId != null &&
        (item.slot1GameTeamId === viewerTeamId ||
          item.slot2GameTeamId === viewerTeamId),
    );
    return match ? [{ roundNumber: round.roundNumber, match }] : [];
  });
  const hidden = data.rounds.filter(
    (round) => round.state === "not_made" || round.state === "draft",
  );
  const played = mine.filter((item) => item.match.state === "confirmed").length;

  return (
    <section aria-labelledby="your-rounds-heading">
      <div className="flex items-baseline justify-between gap-3 pb-2.5">
        <h2
          id="your-rounds-heading"
          className="font-expanded text-title tracking-[-0.03em]"
        >
          {viewerDay
            ? m.finished.yourMatchesTitle(viewerDay.matchCount)
            : m.yourRounds.title}
        </h2>
        <p className="text-muted-foreground text-meta">
          {viewerDay
            ? m.finished.gamesForAgainst(
                viewerDay.gamesFor,
                viewerDay.gamesAgainst,
              )
            : m.yourRounds.meta(played, data.roundCount)}
        </p>
      </div>
      <ul className={cn(ROUND_CARD, "divide-rule divide-y")}>
        {mine.map(({ roundNumber, match }) => {
          const viewerSlot =
            match.slot1GameTeamId === viewerTeamId
              ? (1 as const)
              : (2 as const);
          const opponentId =
            viewerSlot === 1 ? match.slot2GameTeamId : match.slot1GameTeamId;
          const opponent = teams.get(opponentId);
          const line = yourRoundLine(
            roundNumber,
            match,
            viewerSlot,
            m.yourRounds,
            locale,
          );
          const row =
            line.mark === "lost" &&
            viewerDay?.poolWinnerGameTeamId === opponentId
              ? { ...line, line: m.finished.lostToWinners(roundNumber) }
              : line;
          const upcoming =
            match.state === "scheduled" || match.state === "on_court";
          return (
            <li
              key={match.matchId}
              className="flex min-h-14 items-center gap-3 px-4 py-3"
            >
              <ResultMark variant={row.mark} className="size-5" />
              <TeamMark team={opponent} isViewer={false} />
              <span className="min-w-0 flex-1">
                <TeamNames team={opponent} viewerUserId={viewerUserId} />
                <span className="text-muted-foreground text-[11px]">
                  {row.line}
                </span>
              </span>
              {match.canConfirm ? (
                <button
                  type="button"
                  onClick={() =>
                    onEnterScore({ roundNumber, match, mode: "confirm" })
                  }
                  className="bg-ink text-paper text-meta focus-visible:ring-ring/50 inline-flex min-h-11 shrink-0 items-center rounded-md px-3 font-semibold outline-none focus-visible:ring-[3px]"
                >
                  {m.confirm.confirm(row.score ?? "")}
                </button>
              ) : match.canEnterScore && match.state !== "confirmed" ? (
                <button
                  type="button"
                  onClick={() =>
                    onEnterScore({ roundNumber, match, mode: "enter" })
                  }
                  className="bg-ink text-paper text-meta focus-visible:ring-ring/50 inline-flex min-h-11 shrink-0 items-center rounded-md px-3 font-semibold outline-none focus-visible:ring-[3px]"
                >
                  {m.round.enterScore}
                </button>
              ) : row.score ? (
                <ScoreText
                  className={cn(
                    "font-expanded text-[16px]",
                    match.state !== "confirmed" && "text-muted-foreground",
                  )}
                >
                  {row.score}
                </ScoreText>
              ) : upcoming ? (
                <span className="text-muted-foreground text-meta shrink-0">
                  {match.courtName}
                </span>
              ) : null}
            </li>
          );
        })}
        {hidden.length > 0 ? (
          <li className="text-muted-foreground text-meta px-4 py-3">
            {m.yourRounds.later(
              hidden[0]!.roundNumber,
              hidden[hidden.length - 1]!.roundNumber,
            )}
          </li>
        ) : null}
      </ul>
    </section>
  );
}

export function TournamentStandingsTab({
  poolTables,
  groupsThenKnockout,
  qualifiersPerPool,
  data,
  teams,
  viewerUserId,
  onEnterScore,
  finished = null,
}: {
  poolTables: PoolTables;
  groupsThenKnockout: boolean;
  qualifiersPerPool: number | null;
  data: TournamentRoundsData | undefined;
  teams: ReadonlyMap<string, RoundsTeam>;
  viewerUserId: string;
  onEnterScore: (target: ScoreSheetTarget) => void;
  finished?: TournamentFinishedView | null;
}) {
  const m = useMessages();
  const defaultPool = defaultStandingsPoolIndex(
    poolTables.viewerPoolIndex,
    poolTables.pools,
  );
  const [selected, setSelected] = React.useState(String(defaultPool ?? ""));
  const qualifiers = groupsThenKnockout
    ? resolveQualifiersPerPool(
        poolTables.pools.map((pool) => pool.rows.length),
        qualifiersPerPool,
      )
    : null;

  const tables = poolTables.pools.map((pool) => (
    <PoolTable
      key={pool.poolIndex}
      rows={pool.rows}
      poolFinished={pool.finished}
      dayOver={finished != null}
      qualifiers={qualifiers}
      teams={teams}
      viewerUserId={viewerUserId}
    />
  ));

  return (
    <div className="space-y-[26px]">
      {poolTables.pools.length > 1 ? (
        <Tabs
          value={selected || String(poolTables.pools[0]?.poolIndex ?? "")}
          onValueChange={setSelected}
          className="gap-[18px]"
        >
          <TabsList
            variant="segmented"
            aria-label={m.tournament.home.poolsSegment}
          >
            {poolTables.pools.map((pool) => (
              <TabsTrigger key={pool.poolIndex} value={String(pool.poolIndex)}>
                {pool.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {poolTables.pools.map((pool, index) => (
            <TabsContent key={pool.poolIndex} value={String(pool.poolIndex)}>
              {tables[index]}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        tables
      )}
      {data ? (
        <TournamentYourRoundsList
          data={data}
          teams={teams}
          viewerUserId={viewerUserId}
          onEnterScore={onEnterScore}
          viewerDay={finished?.viewerDay ?? null}
        />
      ) : null}
    </div>
  );
}

export function TournamentTeamsTab({
  data,
  poolLabels,
  teams,
  viewerUserId,
}: {
  data: TournamentRoundsData;
  poolLabels: ReadonlyMap<number, string>;
  teams: ReadonlyMap<string, RoundsTeam>;
  viewerUserId: string;
}) {
  const m = useMessages().tournamentRounds;
  return (
    <div className="space-y-[22px]">
      {data.pools.map((pool) => (
        <section key={pool.poolIndex}>
          <h2 className="font-expanded text-title pb-2.5 tracking-[-0.03em]">
            {m.teams.pool(
              poolLabels.get(pool.poolIndex) ?? "",
              pool.gameTeamIds.length,
            )}
          </h2>
          <ol className={cn(ROUND_CARD, "divide-rule divide-y")}>
            {pool.gameTeamIds.map((teamId, index) => {
              const team = teams.get(teamId);
              const isViewer = teamId === data.viewerGameTeamId;
              return (
                <li
                  key={teamId}
                  className={cn(
                    "flex min-h-14 items-center gap-3 px-4 py-3",
                    isViewer && "bg-wash",
                  )}
                >
                  <span className="text-muted-foreground text-meta w-5 tabular-nums">
                    {index + 1}
                  </span>
                  <TeamMark team={team} isViewer={isViewer} />
                  <TeamNames
                    team={team}
                    viewerUserId={viewerUserId}
                    className="flex-1"
                  />
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
