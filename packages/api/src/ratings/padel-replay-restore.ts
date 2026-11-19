import { and, count, eq, gt, sql } from "drizzle-orm";

import {
  GroupSportEnum,
  kingPlaceAwards,
  levelOverrides,
  ratingEvents,
  ratingReplayBackups,
  ratingReplayRuns,
  type DbTx,
  type RatingReplaySummary,
  type RatingReplayTable,
} from "@repo/db";

import type { DbClient } from "#src/ratings/padel-replay-dry-run";
import {
  lockRatings,
  perReplayTable,
  REPLAY_TABLE_NAMES,
  setColumns,
  writtenObject,
} from "#src/ratings/padel-replay-tables";

const PADEL = GroupSportEnum.PADEL;

export type PadelReplayRestore =
  | { kind: "restored"; restored: Record<RatingReplayTable, number> }
  | { kind: "refused"; reason: string };

type Run = { id: string; appliedAt: Date; summary: RatingReplaySummary };

async function laterRunExists(tx: DbTx, run: Run): Promise<boolean> {
  return (
    (await tx.$count(
      ratingReplayRuns,
      gt(ratingReplayRuns.appliedAt, run.appliedAt),
    )) > 0
  );
}

/** Whether a padel Rated Match, Level override or Place award was written or removed after the run. */
async function ledgerMovedSince(tx: DbTx, run: Run): Promise<boolean> {
  const ledgerTables = [ratingEvents, levelOverrides, kingPlaceAwards];
  const [events, overrides, awards, ...newer] = await Promise.all([
    ...ledgerTables.map((table) => tx.$count(table, eq(table.sport, PADEL))),
    ...ledgerTables.map((table) =>
      tx.$count(
        table,
        and(eq(table.sport, PADEL), gt(table.createdAt, run.appliedAt)),
      ),
    ),
  ]);
  const { ledger } = run.summary;
  return (
    newer.some((rows) => rows > 0) ||
    events !== ledger.events ||
    overrides !== ledger.overrides ||
    awards !== ledger.awards
  );
}

/** Backed-up rows of `table` that are gone, or whose replayed columns no longer hold what the run wrote. */
async function overwrittenSince(
  tx: DbTx,
  runId: string,
  table: RatingReplayTable,
): Promise<number> {
  const [row] = await tx
    .select({ count: count() })
    .from(ratingReplayBackups)
    .where(
      and(
        eq(ratingReplayBackups.runId, runId),
        eq(ratingReplayBackups.tableName, table),
        sql`not exists (
          select 1 from ${sql.identifier(table)} as t
          where t.id = ${ratingReplayBackups.rowId}
            and t.sport = ${PADEL}
            and ${writtenObject(table, "t")} = ${ratingReplayBackups.written}
        )`,
      ),
    );
  return row?.count ?? 0;
}

/**
 * Why a run can no longer be written back, or null. After a later run, or
 * the next padel Rated Match, Level override or Place award, the fix is
 * forward, not back; so it is once anything else wrote over the values the
 * run wrote. A column the run did not write, such as Reliability, may move.
 */
async function restoreRefusal(tx: DbTx, run: Run): Promise<string | null> {
  if (await laterRunExists(tx, run)) {
    return "a later Level recalculation run exists";
  }
  if (await ledgerMovedSince(tx, run)) {
    return "a padel Rated Match, Level override or Place award was written or removed after the run";
  }
  for (const table of REPLAY_TABLE_NAMES) {
    const overwritten = await overwrittenSince(tx, run.id, table);
    if (overwritten > 0) {
      return `${overwritten} ${table} rows the run wrote changed after it`;
    }
  }
  return null;
}

/** Writes the replayed columns of every backed-up row of `table` back from its backup. */
async function writeBack(tx: DbTx, runId: string, table: RatingReplayTable) {
  const identifier = sql.identifier(table);
  await tx.execute(sql`
    update ${identifier} as t
    set ${sql.join(
      Object.keys(setColumns(table)).map(
        (column) =>
          sql`${sql.identifier(column)} = r.${sql.identifier(column)}`,
      ),
      sql`, `,
    )}
    from (
      select (jsonb_populate_record(null::${identifier}, b.row)).*
      from rating_replay_backups as b
      where b.run_id = ${runId} and b.table_name = ${table}
    ) as r
    where t.id = r.id and t.sport = ${PADEL}
  `);
}

async function backedUpCounts(
  tx: DbTx,
  runId: string,
): Promise<Record<RatingReplayTable, number>> {
  const rows = await tx
    .select({ tableName: ratingReplayBackups.tableName, count: count() })
    .from(ratingReplayBackups)
    .where(eq(ratingReplayBackups.runId, runId))
    .groupBy(ratingReplayBackups.tableName);
  return perReplayTable(
    (table) => rows.find((row) => row.tableName === table)?.count ?? 0,
  );
}

/**
 * `--restore <run id>`: writes back, from the backup, every column the run
 * wrote, and removes the run, so with nothing written since every table
 * holds its bytes from before the run. A column the run did not write keeps
 * what it holds now. The Notifications the run wrote stay.
 */
export async function restorePadelReplay(
  database: DbClient,
  args: { runId: string },
): Promise<PadelReplayRestore> {
  return database.transaction(
    async (tx): Promise<PadelReplayRestore> => {
      await lockRatings(tx);
      const run = await tx.query.ratingReplayRuns.findFirst({
        where: eq(ratingReplayRuns.id, args.runId),
      });
      if (!run) {
        return {
          kind: "refused",
          reason: `no Level recalculation run ${args.runId}`,
        };
      }
      const refusal = await restoreRefusal(tx, run);
      if (refusal) {
        return { kind: "refused", reason: refusal };
      }
      const restored = await backedUpCounts(tx, run.id);
      for (const table of REPLAY_TABLE_NAMES) {
        await writeBack(tx, run.id, table);
      }
      await tx.delete(ratingReplayRuns).where(eq(ratingReplayRuns.id, run.id));
      return { kind: "restored", restored };
    },
    { isolationLevel: "repeatable read" },
  );
}
