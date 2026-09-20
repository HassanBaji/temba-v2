"use client";

import * as React from "react";

import { ListRow, RowList } from "~/components/common/row-list";
import { ResultMark } from "~/components/temba/result-mark";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatGameCardDay } from "~/lib/format-game-start";
import {
  POOL_RESULTS_HEADING,
  POOL_TABLE_HEADING,
  POOL_WINNER_LABEL,
  TOURNAMENT_FINISHED_COPY,
  YOUR_ROUNDS_HEADING,
  poolRecordDisplay,
} from "~/lib/tournament-pool-table";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

type PoolTables = NonNullable<RouterOutputs["games"]["poolTables"]>;
type PoolTable = PoolTables["pools"][number];
type PoolRow = PoolTable["rows"][number];
type PoolMatch = PoolTable["matches"][number];
type ViewerRound = PoolTable["viewerRounds"][number];

const CARD = "border-rule overflow-hidden rounded-[14px] border";
const COL_POSITION = "w-[46px] pl-5 pr-0 text-left";
const COL_TEAM = "px-2 text-left";
const COL_STAT = "w-[38px] px-0 text-center";
const HEAD_CELL = "py-3.5 font-normal";
const BODY_CELL = "py-4";

function roundSubtitle(
  roundNumber: number | null,
  startTime: Date | string | null,
) {
  const round = roundNumber != null ? `Round ${roundNumber}` : "Round";
  if (!startTime) {
    return round;
  }
  return `${round}, ${formatGameCardDay(startTime)}`;
}

function viewerMark(round: ViewerRound): "won" | "lost" | "not-played" {
  if (round.viewerOutcome === "won") {
    return "won";
  }
  if (round.viewerOutcome === "lost") {
    return "lost";
  }
  return "not-played";
}

function matchesByRound(matches: PoolMatch[]) {
  const groups = new Map<number, PoolMatch[]>();
  for (const match of matches) {
    const round = match.roundNumber ?? 0;
    const list = groups.get(round) ?? [];
    list.push(match);
    groups.set(round, list);
  }
  return [...groups.entries()].sort(([left], [right]) => left - right);
}

function PoolRecordTable({
  rows,
  finished,
}: {
  rows: PoolRow[];
  finished: boolean;
}) {
  return (
    <div className={CARD}>
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-rule text-dim text-eyebrow border-b">
            <th scope="col" className={cn(COL_POSITION, HEAD_CELL)}>
              #
            </th>
            <th scope="col" className={cn(COL_TEAM, HEAD_CELL)}>
              Game team
            </th>
            <th scope="col" className={cn(COL_STAT, HEAD_CELL)}>
              P
            </th>
            <th scope="col" className={cn(COL_STAT, HEAD_CELL)}>
              W
            </th>
            <th scope="col" className={cn(COL_STAT, HEAD_CELL)}>
              D
            </th>
            <th scope="col" className={cn(COL_STAT, HEAD_CELL, "pr-5")}>
              L
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.gameTeamId}
              className={cn("border-rule border-t", row.isViewer && "bg-muted")}
            >
              <td
                className={cn(
                  COL_POSITION,
                  BODY_CELL,
                  "font-expanded text-[15px]",
                )}
              >
                {row.position}
              </td>
              <td className={cn(COL_TEAM, BODY_CELL)}>
                <span
                  className={cn(
                    "block truncate text-[15px]",
                    row.isViewer && "font-semibold",
                  )}
                >
                  {row.name}
                </span>
                {finished && row.isWinner ? (
                  <Badge variant="success" className="mt-1">
                    {POOL_WINNER_LABEL}
                  </Badge>
                ) : null}
              </td>
              <td
                className={cn(
                  COL_STAT,
                  BODY_CELL,
                  "font-expanded text-[15px] tabular-nums",
                )}
              >
                {poolRecordDisplay(row.played)}
              </td>
              <td
                className={cn(
                  COL_STAT,
                  BODY_CELL,
                  "font-expanded text-[15px] tabular-nums",
                )}
              >
                {poolRecordDisplay(row.won)}
              </td>
              <td
                className={cn(
                  COL_STAT,
                  BODY_CELL,
                  "font-expanded text-[15px] tabular-nums",
                )}
              >
                {poolRecordDisplay(row.drawn)}
              </td>
              <td
                className={cn(
                  COL_STAT,
                  BODY_CELL,
                  "font-expanded pr-5 text-[15px] tabular-nums",
                )}
              >
                {poolRecordDisplay(row.lost)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ViewerRounds({ rounds }: { rounds: ViewerRound[] }) {
  if (rounds.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2">
      <h4 className="text-title font-medium">{YOUR_ROUNDS_HEADING}</h4>
      <RowList aria-label={YOUR_ROUNDS_HEADING}>
        {rounds.map((round) => (
          <ListRow
            key={round.matchId}
            icon={
              round.viewerOutcome === "draw" ? undefined : (
                <ResultMark variant={viewerMark(round)} className="size-5" />
              )
            }
            title={round.opponentName}
            subtitle={roundSubtitle(round.roundNumber, round.startTime)}
            trailing={
              <span className="font-expanded text-[16px] tabular-nums">
                {round.cancelled
                  ? "Not played"
                  : (round.scoreLabel ??
                    (round.viewerOutcome === "draw" ? "Draw" : "Open"))}
              </span>
            }
          />
        ))}
      </RowList>
    </div>
  );
}

function PoolResults({ matches }: { matches: PoolMatch[] }) {
  if (matches.length === 0) {
    return null;
  }
  const groups = matchesByRound(matches);
  return (
    <div className="space-y-3">
      <h4 className="text-title font-medium">{POOL_RESULTS_HEADING}</h4>
      {groups.map(([roundNumber, roundMatches]) => (
        <div key={roundNumber} className="space-y-2">
          {roundNumber > 0 ? (
            <p className="text-muted-foreground text-sm">
              {roundSubtitle(roundNumber, roundMatches[0]?.startTime ?? null)}
            </p>
          ) : null}
          <div className={CARD}>
            <ul>
              {roundMatches.map((match, index) => (
                <li
                  key={match.matchId}
                  className={cn(
                    "flex items-center gap-3 px-5 py-4 text-[14px]",
                    index > 0 && "border-rule border-t",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {match.slot1Name}
                  </span>
                  <span className="font-expanded text-[16px] tabular-nums">
                    {match.cancelled
                      ? "Not played"
                      : (match.scoreLabel ?? "Open")}
                  </span>
                  <span className="text-muted-foreground min-w-0 flex-1 truncate text-right">
                    {match.slot2Name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TournamentPoolTablesPanel({
  poolTables,
}: {
  poolTables: PoolTables;
}) {
  const defaultPool = String(
    poolTables.viewerPoolIndex ?? poolTables.pools[0]?.poolIndex ?? 1,
  );
  const [selected, setSelected] = React.useState(defaultPool);
  const selectedPool =
    poolTables.pools.find((pool) => String(pool.poolIndex) === selected) ??
    poolTables.pools[0];

  if (!selectedPool) {
    return null;
  }

  return (
    <Card variant="outlined" className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-title font-medium">{POOL_TABLE_HEADING}</h3>
        {poolTables.finished ? (
          <p className="text-muted-foreground text-sm">
            {TOURNAMENT_FINISHED_COPY}
          </p>
        ) : null}
      </div>

      {poolTables.pools.length > 1 ? (
        <Tabs value={selected} onValueChange={setSelected}>
          <TabsList className="w-full">
            {poolTables.pools.map((pool) => (
              <TabsTrigger
                key={pool.poolIndex}
                value={String(pool.poolIndex)}
                className="flex-1"
              >
                {pool.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {poolTables.pools.map((pool) => (
            <TabsContent
              key={pool.poolIndex}
              value={String(pool.poolIndex)}
              className="space-y-6 pt-4"
            >
              <PoolRecordTable rows={pool.rows} finished={pool.finished} />
              <ViewerRounds rounds={pool.viewerRounds} />
              <PoolResults matches={pool.matches} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="space-y-6">
          <PoolRecordTable
            rows={selectedPool.rows}
            finished={selectedPool.finished}
          />
          <ViewerRounds rounds={selectedPool.viewerRounds} />
          <PoolResults matches={selectedPool.matches} />
        </div>
      )}
    </Card>
  );
}
