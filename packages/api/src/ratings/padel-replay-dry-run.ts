import { levelCheckResults, type DbTx } from "@repo/db";

import { type db } from "#src/db";
import {
  replayPadelLedger,
  type PadelLedger,
  type PadelReplay,
} from "#src/ratings/padel-replay";
import {
  loadPadelLedger,
  loadUpcomingLevelRangeSeats,
} from "#src/ratings/padel-replay-load";
import {
  buildPadelReplayReport,
  type PadelReplayReport,
} from "#src/ratings/padel-replay-report";

export type DbClient = typeof db;

/** Loads the padel ledger in `tx`, replays it under both rule sets and builds the report. */
export async function replayAndReport(
  tx: DbTx,
  args: { host: string; now: Date },
): Promise<{
  ledger: PadelLedger;
  replay: PadelReplay;
  report: PadelReplayReport;
}> {
  const loadStart = performance.now();
  const ledger = await loadPadelLedger(tx);
  const upcoming = await loadUpcomingLevelRangeSeats(tx, args.now);
  const loadMs = performance.now() - loadStart;

  const computeStart = performance.now();
  const replay = replayPadelLedger(ledger, "declared-band");
  const baseline = replayPadelLedger(ledger, "baseline");
  const computeMs = performance.now() - computeStart;

  const report = buildPadelReplayReport({
    host: args.host,
    ledger,
    replay,
    baseline,
    upcoming,
    loadMs,
    computeMs,
  });
  return { ledger, replay, report };
}

/**
 * Why the Level recalculation can no longer run, or null. It does not replay
 * a Level check, so once any Level check has settled it refuses.
 */
export async function levelCheckRefusal(
  database: DbClient | DbTx,
): Promise<string | null> {
  return (await database.$count(levelCheckResults)) > 0
    ? "a Level check has settled, and the recalculation does not replay one"
    : null;
}

/**
 * The dry run: reads the padel ledger in one read-only, repeatable-read
 * transaction, replays it under the Declared band rules and under the
 * baseline, and reports what would change. Writes nothing.
 */
export async function dryRunPadelReplay(
  database: DbClient,
  args: { host: string; now?: Date },
): Promise<PadelReplayReport> {
  const now = args.now ?? new Date();
  const { report } = await database.transaction(
    (tx) => replayAndReport(tx, { host: args.host, now }),
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
  return report;
}
