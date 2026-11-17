import { sql } from "drizzle-orm";

import {
  GroupSportEnum,
  ratingReplayRuns,
  type DbTx,
  type RatingReplaySummary,
  type RatingReplayTable,
} from "@repo/db";

import { notify } from "#src/notifications/notify";
import {
  padelReplayDifferences,
  type PadelLedger,
  type PadelReplay,
  type ReplayDifference,
} from "#src/ratings/padel-replay";
import {
  levelCheckRefusal,
  replayAndReport,
  type DbClient,
} from "#src/ratings/padel-replay-dry-run";
import type { PadelReplayReport } from "#src/ratings/padel-replay-report";
import {
  lockRatings,
  perReplayTable,
  REPLAY_TABLES,
  replayedRow,
  setColumns,
  writtenObject,
  type WriteRow,
} from "#src/ratings/padel-replay-tables";

const PADEL = GroupSportEnum.PADEL;

/**
 * Recipients per `notify()` call. It writes its recipients in one insert of
 * 17 parameters a row, and Postgres takes at most 65,535 in one statement.
 */
export const TOLD_PER_NOTIFY = 1_000;

export type PadelReplayApply =
  | {
      kind: "applied";
      runId: string;
      summary: RatingReplaySummary;
      report: PadelReplayReport;
    }
  | { kind: "unchanged"; report: PadelReplayReport }
  | { kind: "refused"; reason: string; report: PadelReplayReport };

/** The rows the replay could not recompute and carried over by their stored move. */
function carriedOverRows(replay: PadelReplay): number {
  return replay.anomalies
    .filter((anomaly) => anomaly.rule === "carried-over")
    .reduce((sum, anomaly) => sum + anomaly.userIds.length, 0);
}

function replayRefusal(
  report: PadelReplayReport,
  carriedUnplaced: number,
  carryUnplaced: boolean,
): string | null {
  if (report.failed) {
    return "the recalculation would change who is confirmed";
  }
  if (carriedUnplaced > 0 && !carryUnplaced) {
    return `${carriedUnplaced} rows cannot be recomputed [carried-over]; pass --carry-unplaced to carry them over by their stored moves`;
  }
  return null;
}

function replayedRowsByTable(
  differences: readonly ReplayDifference[],
  replay: PadelReplay,
  appliedAt: Date,
): Map<RatingReplayTable, WriteRow[]> {
  const rowsByTable = new Map<RatingReplayTable, WriteRow[]>();
  for (const { table, rowId } of differences) {
    const rows = rowsByTable.get(table) ?? [];
    rows.push(replayedRow(table, rowId, replay, appliedAt));
    rowsByTable.set(table, rows);
  }
  return rowsByTable;
}

function runSummary(
  ledger: PadelLedger,
  rowsByTable: ReadonlyMap<RatingReplayTable, WriteRow[]>,
  carriedUnplaced: number,
): RatingReplaySummary {
  return {
    changed: perReplayTable((table) => rowsByTable.get(table)?.length ?? 0),
    ledger: {
      events: ledger.events.length,
      overrides: ledger.overrides.length,
      awards: ledger.awards.length,
    },
    carriedUnplaced,
  };
}

/**
 * Writes the replayed values over the padel rows of one table, and backs
 * each row up first, whole, with the values written over it. One statement:
 * every part of it reads the rows as they stood before the update. The rows
 * travel as one JSON parameter: JSON keeps every double exactly, and one
 * parameter has no limit on rows.
 */
async function backUpAndWrite(
  tx: DbTx,
  args: { runId: string; table: RatingReplayTable; rows: WriteRow[] },
) {
  const { key } = REPLAY_TABLES[args.table];
  const columns = setColumns(args.table);
  const names = Object.keys(columns);
  const table = sql.identifier(args.table);
  const keyColumn = sql.identifier(key);
  await tx.execute(sql`
    with v as (
      select * from jsonb_to_recordset(${JSON.stringify(args.rows)}::text::jsonb)
        as v(${keyColumn} uuid, ${sql.join(
          names.map(
            (name) =>
              sql`${sql.identifier(name)} ${sql.raw(columns[name] ?? "")}`,
          ),
          sql`, `,
        )})
    ),
    stood as (
      select t.id, to_jsonb(t) as row
      from ${table} as t
      join v on t.${keyColumn} = v.${keyColumn}
      where t.sport = ${PADEL}
    ),
    written as (
      update ${table} as t
      set ${sql.join(
        names.map(
          (name) => sql`${sql.identifier(name)} = v.${sql.identifier(name)}`,
        ),
        sql`, `,
      )}
      from v
      where t.${keyColumn} = v.${keyColumn} and t.sport = ${PADEL}
      returning t.id, ${writtenObject(args.table, "t")} as written
    )
    insert into rating_replay_backups (run_id, table_name, row_id, row, written)
    select ${args.runId}::uuid, ${args.table}::text, stood.id, stood.row, written.written
    from stood
    join written on written.id = stood.id
  `);
}

/** One `level_recalculated` Notification per player told, written already emailed so no email Job is enqueued (ADR-0098). */
export async function tellRecalculated(
  tx: DbTx,
  args: { userIds: readonly string[]; runId: string; emailedAt: Date },
) {
  for (let start = 0; start < args.userIds.length; start += TOLD_PER_NOTIFY) {
    await notify(tx, {
      type: "level_recalculated",
      recipients: args.userIds
        .slice(start, start + TOLD_PER_NOTIFY)
        .map((userId) => ({ userId, audience: "player" as const })),
      excludeUserIds: [],
      dedupeKey: `level_recalculated:${args.runId}`,
      emailedAt: args.emailedAt,
    });
  }
}

async function recordRun(
  tx: DbTx,
  args: { appliedAt: Date; rules: string; summary: RatingReplaySummary },
): Promise<string> {
  const [run] = await tx
    .insert(ratingReplayRuns)
    .values(args)
    .returning({ id: ratingReplayRuns.id });
  if (!run) {
    throw new Error("Failed to record the Level recalculation run");
  }
  return run.id;
}

/**
 * The apply: in one transaction, locks rating writes, loads, replays, backs
 * up every row whose values differ and writes the replayed values over it.
 * Rows that already hold them are not touched, and a run that would change
 * nothing is not recorded. Each account holder whose shown Level or band
 * letter changes gets one `level_recalculated` Notification, written already
 * emailed. Refuses while the recalculation would change who is confirmed,
 * and while a row cannot be recomputed unless `carryUnplaced`.
 */
export async function applyPadelReplay(
  database: DbClient,
  args: { host: string; carryUnplaced: boolean; now?: Date },
): Promise<PadelReplayApply> {
  return database.transaction(
    async (tx): Promise<PadelReplayApply> => {
      await lockRatings(tx);
      const appliedAt = args.now ?? new Date();
      const { ledger, replay, report } = await replayAndReport(tx, {
        host: args.host,
        now: appliedAt,
      });
      const carriedUnplaced = carriedOverRows(replay);
      const refusal =
        (await levelCheckRefusal(tx)) ??
        replayRefusal(report, carriedUnplaced, args.carryUnplaced);
      if (refusal) {
        return { kind: "refused", reason: refusal, report };
      }
      const differences = padelReplayDifferences(ledger, replay);
      if (differences.length === 0) {
        return { kind: "unchanged", report };
      }

      const rowsByTable = replayedRowsByTable(differences, replay, appliedAt);
      const summary = runSummary(ledger, rowsByTable, carriedUnplaced);
      const runId = await recordRun(tx, {
        appliedAt,
        rules: replay.rules,
        summary,
      });
      for (const [table, rows] of rowsByTable) {
        await backUpAndWrite(tx, { runId, table, rows });
      }
      await tellRecalculated(tx, {
        userIds: report.told,
        runId,
        emailedAt: appliedAt,
      });
      return { kind: "applied", runId, summary, report };
    },
    { isolationLevel: "repeatable read" },
  );
}
