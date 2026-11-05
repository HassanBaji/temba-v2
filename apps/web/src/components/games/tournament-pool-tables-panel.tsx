"use client";

import * as React from "react";

import {
  GameTeamPlayersSheet,
  type GameTeamPlayersSheetTeam,
} from "~/components/games/game-team-players-sheet";
import { PairLabel } from "~/components/temba/pair-label";
import { ResultTag } from "~/components/temba/result-mark";
import { useMessages } from "~/components/locale-provider";
import { poolRecordDisplay } from "@repo/domain/tournament-pool-table";
import { gameTeamPlayers } from "~/lib/game-player-links";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

type PoolTables = NonNullable<RouterOutputs["games"]["byId"]["poolTables"]>;
type PoolTable = PoolTables["pools"][number];
type PoolRow = PoolTable["rows"][number];
type GameTeams = Parameters<typeof gameTeamPlayers>[0];

const CARD = "border-rule overflow-hidden rounded-card border";
const COL_POSITION = "w-10 ps-[18px] pe-0 text-start";
const COL_TEAM = "px-2 text-start";
const COL_STAT = "w-[38px] px-0 text-center";
const HEAD_CELL = "py-[13px] font-normal";
const BODY_CELL = "py-4";

export function PoolRecordTable({
  rows,
  finished,
  gameTeams,
}: {
  rows: PoolRow[];
  finished: boolean;
  /** Given when the viewer may open Player profiles from this table. */
  gameTeams?: GameTeams;
}) {
  const m = useMessages();
  const [openTeam, setOpenTeam] =
    React.useState<GameTeamPlayersSheetTeam | null>(null);

  return (
    <div className={CARD}>
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-rule text-eyebrow text-muted-foreground border-b">
            <th scope="col" className={cn(COL_POSITION, HEAD_CELL)}>
              #
            </th>
            <th scope="col" className={cn(COL_TEAM, HEAD_CELL)}>
              {m.tournament.gameTeam}
            </th>
            <th scope="col" className={cn(COL_STAT, HEAD_CELL)}>
              {m.webTournament.poolTable.played}
            </th>
            <th scope="col" className={cn(COL_STAT, HEAD_CELL)}>
              {m.webTournament.poolTable.won}
            </th>
            <th scope="col" className={cn(COL_STAT, HEAD_CELL)}>
              {m.webTournament.poolTable.drawn}
            </th>
            <th scope="col" className={cn(COL_STAT, HEAD_CELL, "pe-[18px]")}>
              {m.webTournament.poolTable.lost}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.gameTeamId}
              className={cn(
                "border-rule min-h-11 border-t",
                row.isViewer && "bg-wash",
              )}
            >
              <td
                className={cn(
                  COL_POSITION,
                  BODY_CELL,
                  "font-expanded text-body",
                )}
              >
                {row.position}
              </td>
              <td className={cn(COL_TEAM, BODY_CELL)}>
                <PoolTeamName
                  row={row}
                  players={
                    gameTeams ? gameTeamPlayers(gameTeams, row.gameTeamId) : []
                  }
                  winner={finished && row.isWinner}
                  onOpen={setOpenTeam}
                />
              </td>
              <td
                className={cn(
                  COL_STAT,
                  BODY_CELL,
                  "font-expanded text-[16px] tabular-nums",
                )}
              >
                {poolRecordDisplay(row.played)}
              </td>
              <td
                className={cn(
                  COL_STAT,
                  BODY_CELL,
                  "font-expanded text-[16px] tabular-nums",
                )}
              >
                {poolRecordDisplay(row.won)}
              </td>
              <td
                className={cn(
                  COL_STAT,
                  BODY_CELL,
                  "font-expanded text-[16px] tabular-nums",
                )}
              >
                {poolRecordDisplay(row.drawn)}
              </td>
              <td
                className={cn(
                  COL_STAT,
                  BODY_CELL,
                  "font-expanded pe-[18px] text-[16px] tabular-nums",
                )}
              >
                {poolRecordDisplay(row.lost)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <GameTeamPlayersSheet team={openTeam} onClose={() => setOpenTeam(null)} />
    </div>
  );
}

function PoolTeamName({
  row,
  players,
  winner,
  onOpen,
}: {
  row: PoolRow;
  players: GameTeamPlayersSheetTeam["players"];
  winner: boolean;
  onOpen: (team: GameTeamPlayersSheetTeam) => void;
}) {
  const m = useMessages();
  const content = (
    <>
      <PairLabel
        label={row.name}
        className={cn("text-body max-w-full", row.isViewer && "font-semibold")}
      />
      {winner ? (
        <ResultTag variant="won" className="text-eyebrow mt-1">
          {m.tournament.poolTable.winner}
        </ResultTag>
      ) : null}
    </>
  );
  if (players.length === 0) {
    return content;
  }
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => onOpen({ name: row.name, players })}
      className="focus-visible:ring-ring/50 -my-3 flex min-h-11 w-full flex-col items-start justify-center rounded-sm text-start underline-offset-2 outline-none hover:underline focus-visible:ring-[3px]"
    >
      {content}
    </button>
  );
}

export function TournamentPoolTablesPanel({
  poolTables,
  gameTeams,
}: {
  poolTables: PoolTables;
  gameTeams?: GameTeams;
}) {
  const m = useMessages();
  if (poolTables.pools.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {poolTables.finished ? (
        <p className="text-muted-foreground text-body">
          {m.tournament.poolTable.finished}
        </p>
      ) : null}
      {poolTables.pools.map((pool) => (
        <PoolRecordTable
          key={pool.poolIndex}
          rows={pool.rows}
          finished={pool.finished}
          gameTeams={gameTeams}
        />
      ))}
    </div>
  );
}
