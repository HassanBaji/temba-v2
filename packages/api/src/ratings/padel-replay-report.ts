import type { RatingReplayTable } from "@repo/db";
import {
  formatLevel,
  formatPadelLevel,
  levelFromMu,
  padelMatchesRemainingToConfirm,
  type LevelBand,
  type PadelConfirmation,
} from "@repo/domain/level";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";

import { displayedLevelPassesRange } from "#src/games/user-allowed-by-level-range";
import {
  padelReplayDifferences,
  type PadelLedger,
  type PadelReplay,
  type ReplayAnomaly,
  type ReplayRating,
  type ReplayStart,
  type ReplayStartKind,
  type ReplayStartSource,
} from "#src/ratings/padel-replay";
import type { UpcomingLevelRangeSeat } from "#src/ratings/padel-replay-load";
import { perReplayTable } from "#src/ratings/padel-replay-tables";

export type PadelReplayPlayerRow = {
  userId: string;
  name: string;
  start: ReplayStartKind;
  startSource: ReplayStartSource;
  declaredBand: LevelBand | null;
  levelBefore: number;
  levelAfter: number;
  move: number;
  bandBefore: LevelBand;
  bandAfter: LevelBand;
  phiBefore: number;
  phiAfter: number;
  verifiedMatchesBefore: number;
  verifiedMatchesAfter: number;
  confirmedBefore: boolean;
  confirmedAfter: boolean;
};

type OutsideLevelRange = UpcomingLevelRangeSeat & {
  name: string;
  levelBefore: number;
  levelAfter: number;
  wasOutside: boolean;
};

export type PadelReplayReport = {
  host: string;
  counts: {
    players: number;
    matches: number;
    events: number;
    overrides: number;
    awards: number;
  };
  starts: Record<ReplayStartKind, Record<ReplayStartSource, number>>;
  rows: PadelReplayPlayerRow[];
  moved: number;
  largestUp: PadelReplayPlayerRow[];
  largestDown: PadelReplayPlayerRow[];
  bandChanges: PadelReplayPlayerRow[];
  confirmationChanges: PadelReplayPlayerRow[];
  /** The account holders whose shown Level or band letter changes: each is told once. */
  told: string[];
  outsideLevelRange: OutsideLevelRange[];
  differences: Record<RatingReplayTable, number>;
  baseline: { events: number; reproduced: number; withinTolerance: number };
  anomalies: ReplayAnomaly[];
  loadMs: number;
  computeMs: number;
  /** True when the run must fail: someone's confirmation would change. */
  failed: boolean;
};

const LARGEST_MOVES = 20;
const MOVE_REPORTED = 0.01;
const MOVE_ROUNDING = 1e-9;
const BASELINE_TOLERANCE = 1e-6;
const UNCONFIRMED: PadelConfirmation = {
  verifiedMatches: 0,
  overridden: false,
};
const RATED_VALUES = [
  "muBefore",
  "phiBefore",
  "sigmaBefore",
  "muAfter",
  "phiAfter",
  "sigmaAfter",
] as const;

function storedConfirmations(
  ledger: PadelLedger,
): Map<string, PadelConfirmation> {
  const verifiedMatchIds = new Set(
    ledger.matches.filter((row) => row.verified).map((row) => row.id),
  );
  const confirmations = new Map<string, PadelConfirmation>();
  const of = (userId: string) => confirmations.get(userId) ?? UNCONFIRMED;
  for (const event of ledger.events) {
    const confirmation = of(event.userId);
    confirmations.set(event.userId, {
      ...confirmation,
      verifiedMatches:
        confirmation.verifiedMatches +
        (verifiedMatchIds.has(event.matchId) ? 1 : 0),
    });
  }
  for (const override of ledger.overrides) {
    confirmations.set(override.userId, {
      ...of(override.userId),
      overridden: true,
    });
  }
  return confirmations;
}

function baselineReproduction(ledger: PadelLedger, baseline: PadelReplay) {
  let reproduced = 0;
  let withinTolerance = 0;
  for (const event of ledger.events) {
    const replayed = baseline.events.get(event.id);
    if (!replayed) {
      continue;
    }
    if (RATED_VALUES.every((column) => event[column] === replayed[column])) {
      reproduced += 1;
    }
    if (
      RATED_VALUES.every(
        (column) =>
          Math.abs(event[column] - replayed[column]) <= BASELINE_TOLERANCE,
      )
    ) {
      withinTolerance += 1;
    }
  }
  return { events: ledger.events.length, reproduced, withinTolerance };
}

function startCounts(
  rows: readonly PadelReplayPlayerRow[],
): PadelReplayReport["starts"] {
  const sources = (): Record<ReplayStartSource, number> => ({
    "never-played": 0,
    "first-match": 0,
    "first-override": 0,
    "first-award": 0,
  });
  const starts: PadelReplayReport["starts"] = {
    declared: sources(),
    unknown: sources(),
    unrecognised: sources(),
    "not-declared": sources(),
  };
  for (const row of rows) {
    starts[row.start][row.startSource] += 1;
  }
  return starts;
}

function shownBandChanged(row: PadelReplayPlayerRow): boolean {
  return (
    displayLabelFromStoredBand(row.bandBefore) !==
    displayLabelFromStoredBand(row.bandAfter)
  );
}

/** A stored Level below 1.0 reads 1.00, so a move down there is not shown. */
function shownLevelChanged(row: PadelReplayPlayerRow): boolean {
  return (
    formatPadelLevel(row.levelBefore, 2) !==
      formatPadelLevel(row.levelAfter, 2) || shownBandChanged(row)
  );
}

function displayedTenths(mu: number): number {
  return Math.round(Number(formatLevel(levelFromMu(mu))) * 10);
}

function playerRow(args: {
  rating: ReplayRating;
  name: string;
  replay: PadelReplay;
  confirmationBefore: PadelConfirmation;
}): PadelReplayPlayerRow {
  const { rating, replay } = args;
  const after = replay.ratings.get(rating.userId) ?? rating;
  const start: ReplayStart = replay.starts.get(rating.userId) ?? {
    kind: "not-declared",
    source: "never-played",
    mu: rating.mu,
    declaredBand: null,
  };
  const confirmationAfter =
    replay.confirmations.get(rating.userId) ?? UNCONFIRMED;
  const levelBefore = levelFromMu(rating.mu);
  const levelAfter = levelFromMu(after.mu);
  return {
    userId: rating.userId,
    name: args.name,
    start: start.kind,
    startSource: start.source,
    declaredBand: start.declaredBand,
    levelBefore,
    levelAfter,
    move: levelAfter - levelBefore,
    bandBefore: rating.levelBand,
    bandAfter: after.levelBand,
    phiBefore: rating.phi,
    phiAfter: after.phi,
    verifiedMatchesBefore: args.confirmationBefore.verifiedMatches,
    verifiedMatchesAfter: confirmationAfter.verifiedMatches,
    confirmedBefore:
      padelMatchesRemainingToConfirm(args.confirmationBefore) === 0,
    confirmedAfter: padelMatchesRemainingToConfirm(confirmationAfter) === 0,
  };
}

/** Players seated on upcoming Games whose replayed Level falls outside the Game Level range. */
function outsideLevelRanges(
  ledger: PadelLedger,
  replay: PadelReplay,
  rows: readonly PadelReplayPlayerRow[],
  upcoming: readonly UpcomingLevelRangeSeat[],
): OutsideLevelRange[] {
  const rowByUser = new Map(rows.map((row) => [row.userId, row]));
  const storedMuOf = new Map(
    ledger.ratings.map((rating) => [rating.userId, rating.mu]),
  );
  return upcoming.flatMap((seat) => {
    const row = rowByUser.get(seat.userId);
    const storedMu = storedMuOf.get(seat.userId);
    const replayedMu = replay.ratings.get(seat.userId)?.mu;
    const passes = (mu: number) =>
      displayedLevelPassesRange(displayedTenths(mu), seat);
    if (
      !row ||
      storedMu === undefined ||
      replayedMu === undefined ||
      passes(replayedMu)
    ) {
      return [];
    }
    return [
      {
        ...seat,
        name: row.name,
        levelBefore: row.levelBefore,
        levelAfter: row.levelAfter,
        wasOutside: !passes(storedMu),
      },
    ];
  });
}

function differenceCounts(
  ledger: PadelLedger,
  replay: PadelReplay,
): Record<RatingReplayTable, number> {
  const differences = padelReplayDifferences(ledger, replay);
  return perReplayTable(
    (table) => differences.filter((row) => row.table === table).length,
  );
}

/** The dry-run report from the ledger and both passes over it. */
export function buildPadelReplayReport(args: {
  host: string;
  ledger: PadelLedger;
  replay: PadelReplay;
  baseline: PadelReplay;
  upcoming: readonly UpcomingLevelRangeSeat[];
  loadMs: number;
  computeMs: number;
}): PadelReplayReport {
  const { ledger, replay } = args;
  const nameOf = new Map(ledger.players.map((row) => [row.id, row.name]));
  const accountHolders = new Set(
    ledger.players.filter((row) => row.accountHolder).map((row) => row.id),
  );
  const before = storedConfirmations(ledger);
  const rows = ledger.ratings.map((rating) =>
    playerRow({
      rating,
      name: nameOf.get(rating.userId) ?? "",
      replay,
      confirmationBefore: before.get(rating.userId) ?? UNCONFIRMED,
    }),
  );
  const byMove = [...rows].sort((left, right) => right.move - left.move);
  const confirmationChanges = rows.filter(
    (row) =>
      row.confirmedBefore !== row.confirmedAfter ||
      row.verifiedMatchesBefore !== row.verifiedMatchesAfter,
  );

  return {
    host: args.host,
    counts: {
      players: ledger.ratings.length,
      matches: new Set(ledger.events.map((row) => row.matchId)).size,
      events: ledger.events.length,
      overrides: ledger.overrides.length,
      awards: ledger.awards.length,
    },
    starts: startCounts(rows),
    rows,
    moved: rows.filter(
      (row) => Math.abs(row.move) >= MOVE_REPORTED - MOVE_ROUNDING,
    ).length,
    largestUp: byMove.filter((row) => row.move > 0).slice(0, LARGEST_MOVES),
    largestDown: byMove
      .filter((row) => row.move < 0)
      .reverse()
      .slice(0, LARGEST_MOVES),
    bandChanges: rows.filter(shownBandChanged),
    confirmationChanges,
    told: rows
      .filter((row) => accountHolders.has(row.userId) && shownLevelChanged(row))
      .map((row) => row.userId),
    outsideLevelRange: outsideLevelRanges(ledger, replay, rows, args.upcoming),
    differences: differenceCounts(ledger, replay),
    baseline: baselineReproduction(ledger, args.baseline),
    anomalies: replay.anomalies,
    loadMs: args.loadMs,
    computeMs: args.computeMs,
    failed: confirmationChanges.length > 0,
  };
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function playerLabel(row: { name: string; userId: string }): string {
  return row.name ? `${row.name} (${row.userId})` : row.userId;
}

function moveLine(row: PadelReplayPlayerRow): string {
  return `  ${signed(row.move)}  ${playerLabel(row)}: ${row.levelBefore.toFixed(2)} ${displayLabelFromStoredBand(row.bandBefore)} φ ${row.phiBefore.toFixed(0)} → ${row.levelAfter.toFixed(2)} ${displayLabelFromStoredBand(row.bandAfter)} φ ${row.phiAfter.toFixed(0)}`;
}

function startLines(report: PadelReplayReport): string[] {
  const { starts } = report;
  const sourceLine = (kind: ReplayStartKind) =>
    `never played ${starts[kind]["never-played"]}, first Match ${starts[kind]["first-match"]}, first override ${starts[kind]["first-override"]}, first award ${starts[kind]["first-award"]}`;
  return [
    "Declared bands recovered:",
    `  declared: ${sourceLine("declared")}`,
    `  "I don't know": ${sourceLine("unknown")}`,
    `  start μ not a band midpoint [start-mu-off-midpoint]: ${sourceLine("unrecognised")}`,
    `  never declared: ${sourceLine("not-declared")}`,
  ];
}

function moveLines(report: PadelReplayReport): string[] {
  const { differences } = report;
  return [
    `Players whose Level moves by 0.01 or more: ${report.moved} of ${report.counts.players}.`,
    `Rows that would change: ratings ${differences.ratings}, rating_events ${differences.rating_events}, king_place_awards ${differences.king_place_awards}, level_overrides ${differences.level_overrides}.`,
    "",
    `Largest moves up (${report.largestUp.length}):`,
    ...report.largestUp.map(moveLine),
    `Largest moves down (${report.largestDown.length}):`,
    ...report.largestDown.map(moveLine),
    "",
    `Band letter changes (${report.bandChanges.length}):`,
    ...report.bandChanges.map(moveLine),
  ];
}

function confirmationLines(report: PadelReplayReport): string[] {
  return [
    `Players crossing the confirmation line or changing their Verified Group Match count: ${report.confirmationChanges.length} (must be 0).`,
    ...report.confirmationChanges.map(
      (row) =>
        `  ${playerLabel(row)}: ${row.verifiedMatchesBefore} → ${row.verifiedMatchesAfter} Verified Group Matches, confirmed ${row.confirmedBefore} → ${row.confirmedAfter}`,
    ),
  ];
}

function levelRangeLines(report: PadelReplayReport): string[] {
  const seats = report.outsideLevelRange;
  return [
    `Seated on upcoming Games and outside the Game Level range after the recalculation: ${seats.length} (${seats.filter((seat) => !seat.wasOutside).length} newly outside).`,
    ...seats.map(
      (seat) =>
        `  ${playerLabel({ name: seat.name, userId: seat.userId })} on Game ${seat.gameId}: ${seat.levelBefore.toFixed(2)} → ${seat.levelAfter.toFixed(2)}, range ${seat.levelMinTenths ?? "–"} to ${seat.levelMaxTenths ?? "–"} tenths${seat.wasOutside ? ", already outside" : ""}`,
    ),
  ];
}

function anomalyLines(report: PadelReplayReport): string[] {
  const names = new Map(report.rows.map((row) => [row.userId, row.name]));
  const userLabel = (userId: string) =>
    playerLabel({ userId, name: names.get(userId) ?? "" });
  return [
    `Anomalies (${report.anomalies.length}):`,
    ...report.anomalies.map(
      (anomaly) =>
        `  [${anomaly.rule}] ${anomaly.userIds.map(userLabel).join(", ")}: ${anomaly.detail}`,
    ),
  ];
}

/** The report as the command prints it. */
export function formatPadelReplayReport(
  report: PadelReplayReport,
  mode: "dry-run" | "apply" = "dry-run",
): string[] {
  const { counts } = report;
  const lines = [
    mode === "apply"
      ? `Padel Level recalculation, apply against ${report.host}, in one transaction.`
      : `Padel Level recalculation, dry run against ${report.host}. Nothing is written.`,
    "",
    `Players ${counts.players}, Rated Matches ${counts.matches}, rating events ${counts.events}, Level overrides ${counts.overrides}, Place awards ${counts.awards}.`,
    "",
    ...startLines(report),
    "",
    ...moveLines(report),
    "",
    mode === "apply"
      ? `Players told their Level was recalculated, in the app only: ${report.told.length}.`
      : `Players who would be told their Level was recalculated, in the app only: ${report.told.length}.`,
    "",
    ...confirmationLines(report),
    "",
    ...levelRangeLines(report),
    "",
    `Baseline pass (φ 350, no Prove-it rule): reproduces ${report.baseline.reproduced} of ${report.baseline.events} stored rating events exactly, ${report.baseline.withinTolerance} within ${BASELINE_TOLERANCE}.`,
    "",
    ...anomalyLines(report),
    "",
    `Loaded in ${report.loadMs.toFixed(0)} ms, computed in ${report.computeMs.toFixed(0)} ms.`,
  ];
  if (report.failed) {
    lines.push(
      "FAILED: the recalculation would change who is confirmed. Nothing may be applied.",
    );
  }
  return lines;
}

function csvCell(value: string | number | boolean | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const CSV_HEADER = [
  "user_id",
  "name",
  "start",
  "start_source",
  "declared_band",
  "level_before",
  "level_after",
  "move",
  "band_before",
  "band_after",
  "phi_before",
  "phi_after",
  "verified_matches",
  "confirmed",
];

function csvLine(row: PadelReplayPlayerRow): string {
  return [
    row.userId,
    row.name,
    row.start,
    row.startSource,
    row.declaredBand,
    row.levelBefore.toFixed(4),
    row.levelAfter.toFixed(4),
    row.move.toFixed(4),
    displayLabelFromStoredBand(row.bandBefore),
    displayLabelFromStoredBand(row.bandAfter),
    row.phiBefore.toFixed(2),
    row.phiAfter.toFixed(2),
    row.verifiedMatchesAfter,
    row.confirmedAfter,
  ]
    .map(csvCell)
    .join(",");
}

/** One CSV row per padel player, for `--report <path>`. */
export function padelReplayCsv(report: PadelReplayReport): string {
  return [CSV_HEADER.join(","), ...report.rows.map(csvLine)].join("\n") + "\n";
}
