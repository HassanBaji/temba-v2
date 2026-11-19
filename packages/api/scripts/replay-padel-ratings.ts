/**
 * The Level recalculation (ADR-0100): replays every padel Rated Match, Place
 * award and Level override under the Declared band rules and reports per
 * player what their Level would become.
 *
 * Dry run (the default): reads in one read-only transaction and writes
 * nothing. Exits non-zero when the recalculation would change who is
 * confirmed.
 *
 * --apply: in one transaction, locks rating writes, backs up every row whose
 * values differ and writes the replayed values. Tells each account holder
 * whose shown Level or band letter changed, in the app only. Prints the run
 * id. Refuses while rows cannot be recomputed unless --carry-unplaced is
 * passed.
 *
 * --restore <run id>: writes back from that run's backup every column the run
 * wrote; the Notifications stay. Refuses once a padel Rated Match, Level
 * override or Place award was written after the run, or anything else wrote
 * over the values the run wrote.
 *
 * Every command refuses once a Level check has settled: the recalculation
 * does not replay one, so it runs only before the Level check deploys.
 *
 * Needs DATABASE_URL (read from .env if present).
 *
 * Run: pnpm --filter @repo/api db:replay-padel-ratings
 *      pnpm --filter @repo/api db:replay-padel-ratings -- --report <path>
 *      pnpm --filter @repo/api db:replay-padel-ratings -- --apply [--carry-unplaced]
 *      pnpm --filter @repo/api db:replay-padel-ratings -- --restore <run id>
 */
import { writeFile } from "node:fs/promises";

import { db } from "#src/db";
import { applyPadelReplay } from "#src/ratings/padel-replay-apply";
import {
  dryRunPadelReplay,
  levelCheckRefusal,
} from "#src/ratings/padel-replay-dry-run";
import {
  formatPadelReplayReport,
  padelReplayCsv,
  type PadelReplayReport,
} from "#src/ratings/padel-replay-report";
import { restorePadelReplay } from "#src/ratings/padel-replay-restore";

const USAGE =
  "Usage: [--report <path>] | --apply [--carry-unplaced] [--report <path>] | --restore <run id>";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Command =
  | { kind: "dry-run"; report: string | null }
  | { kind: "apply"; report: string | null; carryUnplaced: boolean }
  | { kind: "restore"; runId: string };

function databaseHost() {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "an unknown host";
  }
}

function parseCommand(args: readonly string[]): Command {
  const flags = args.filter((arg) => arg !== "--");
  let report: string | null = null;
  let apply = false;
  let carryUnplaced = false;
  let restore: string | null = null;
  const fail = (): never => {
    throw new Error(`Unknown arguments: ${flags.join(" ")}. ${USAGE}`);
  };
  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (flag === "--apply" && !apply) {
      apply = true;
    } else if (flag === "--carry-unplaced" && !carryUnplaced) {
      carryUnplaced = true;
    } else if (flag === "--report" && report === null) {
      report = flags[++index] ?? fail();
    } else if (flag === "--restore" && restore === null) {
      restore = flags[++index] ?? fail();
    } else {
      fail();
    }
  }
  if (restore !== null) {
    if (apply || carryUnplaced || report !== null || !UUID.test(restore)) {
      fail();
    }
    return { kind: "restore", runId: restore };
  }
  if (apply) {
    return { kind: "apply", report, carryUnplaced };
  }
  if (carryUnplaced) {
    fail();
  }
  return { kind: "dry-run", report };
}

async function writeReport(report: PadelReplayReport, path: string | null) {
  if (path) {
    await writeFile(path, padelReplayCsv(report));
    console.log(`Wrote ${report.rows.length} players to ${path}.`);
  }
}

async function main() {
  const command = parseCommand(process.argv.slice(2));
  const host = databaseHost();
  const refusal = await levelCheckRefusal(db);
  if (refusal) {
    console.error(`Refused against ${host}: ${refusal}. Nothing was written.`);
    return 1;
  }

  if (command.kind === "restore") {
    const result = await restorePadelReplay(db, { runId: command.runId });
    if (result.kind === "refused") {
      console.error(`Restore refused: ${result.reason}. Nothing was written.`);
      return 1;
    }
    const { restored } = result;
    console.log(
      `Restored run ${command.runId} against ${host}: ratings ${restored.ratings}, rating_events ${restored.rating_events}, king_place_awards ${restored.king_place_awards}, level_overrides ${restored.level_overrides}. The run and its backup are removed.`,
    );
    return 0;
  }

  if (command.kind === "dry-run") {
    const report = await dryRunPadelReplay(db, { host });
    console.log(formatPadelReplayReport(report).join("\n"));
    await writeReport(report, command.report);
    return report.failed ? 1 : 0;
  }

  const result = await applyPadelReplay(db, {
    host,
    carryUnplaced: command.carryUnplaced,
  });
  console.log(formatPadelReplayReport(result.report, "apply").join("\n"));
  await writeReport(result.report, command.report);
  console.log("");
  switch (result.kind) {
    case "refused":
      console.error(`Apply refused: ${result.reason}. Nothing was written.`);
      return 1;
    case "unchanged":
      console.log("Nothing differs. Nothing was written and no run recorded.");
      return 0;
    case "applied": {
      const { changed } = result.summary;
      console.log(
        `Applied run ${result.runId}: ratings ${changed.ratings}, rating_events ${changed.rating_events}, king_place_awards ${changed.king_place_awards}, level_overrides ${changed.level_overrides} rows written, each backed up. ${result.report.told.length} players told their Level was recalculated, in the app only.`,
      );
      console.log(
        `To undo before anything rates on top: pnpm --filter @repo/api db:replay-padel-ratings -- --restore ${result.runId}`,
      );
      return 0;
    }
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
