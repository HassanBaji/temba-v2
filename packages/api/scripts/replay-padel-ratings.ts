/**
 * The Level recalculation's dry run (spec 9.8 in
 * `.scratch/padel-declared-band-trust/spec.md`): replays every padel Rated
 * Match, Place award and Level override under the Declared band rules and
 * reports per player what their Level would become. Reads in one read-only
 * transaction and writes nothing. Exits non-zero when the recalculation
 * would change who is confirmed.
 *
 * Needs DATABASE_URL (read from .env if present).
 *
 * Run: pnpm --filter @repo/api db:replay-padel-ratings
 *      pnpm --filter @repo/api db:replay-padel-ratings -- --report <path>
 */
import { writeFile } from "node:fs/promises";

import { db } from "#src/db";
import {
  dryRunPadelReplay,
  formatPadelReplayReport,
  padelReplayCsv,
} from "#src/ratings/padel-replay";

function databaseHost() {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "an unknown host";
  }
}

function reportPath(args: readonly string[]): string | null {
  const flags = args.filter((arg) => arg !== "--");
  const [flag, path, ...rest] = flags;
  if (flag === undefined) {
    return null;
  }
  if (flag !== "--report" || !path || rest.length > 0) {
    throw new Error(
      `Unknown arguments: ${flags.join(" ")}. The only flag is --report <path>.`,
    );
  }
  return path;
}

async function main() {
  const path = reportPath(process.argv.slice(2));
  const report = await dryRunPadelReplay(db, { host: databaseHost() });
  console.log(formatPadelReplayReport(report).join("\n"));
  if (path) {
    await writeFile(path, padelReplayCsv(report));
    console.log(`Wrote ${report.rows.length} players to ${path}.`);
  }
  return report.failed ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
