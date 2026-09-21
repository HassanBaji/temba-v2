"use client";

import { Badge } from "~/components/ui/badge";
import {
  POOL_WINNER_LABEL,
  TOURNAMENT_FINISHED_COPY,
  poolRecordDisplay,
} from "~/lib/tournament-pool-table";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

type PoolTables = NonNullable<RouterOutputs["games"]["byId"]["poolTables"]>;
type PoolTable = PoolTables["pools"][number];
type PoolRow = PoolTable["rows"][number];

const CARD = "border-rule overflow-hidden rounded-[14px] border";
const COL_POSITION = "w-10 pl-[18px] pr-0 text-left";
const COL_TEAM = "px-2 text-left";
const COL_STAT = "w-[38px] px-0 text-center";
const HEAD_CELL = "py-[13px] font-normal";
const BODY_CELL = "py-4";

export function PoolRecordTable({
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
          <tr className="border-rule text-eyebrow text-muted-foreground border-b">
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
            <th scope="col" className={cn(COL_STAT, HEAD_CELL, "pr-[18px]")}>
              L
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
                  "font-expanded pr-[18px] text-[16px] tabular-nums",
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

export function TournamentPoolTablesPanel({
  poolTables,
}: {
  poolTables: PoolTables;
}) {
  if (poolTables.pools.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {poolTables.finished ? (
        <p className="text-muted-foreground text-sm">
          {TOURNAMENT_FINISHED_COPY}
        </p>
      ) : null}
      {poolTables.pools.map((pool) => (
        <PoolRecordTable
          key={pool.poolIndex}
          rows={pool.rows}
          finished={pool.finished}
        />
      ))}
    </div>
  );
}
