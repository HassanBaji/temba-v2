/**
 * Planning prototype for the replay in
 * `.scratch/padel-declared-band-trust/spec.md` (section 9). Not production
 * code. It builds a small synthetic padel history under today's rules (every
 * declaration at φ 350, no Prove-it rule), then replays that ledger under the
 * new rules the way the spec describes: start states recovered from the first
 * ledger row, every Match in order at its stored weight through the real
 * `rateDoublesMatch`, a Level override kept as the absolute Level it set.
 *
 * It prints the per-player before and after, and checks the two properties
 * the replay's tests rest on: a second replay changes nothing, and a history
 * written under the new rules replays to itself exactly.
 *
 * Run from the Workspace root:
 *   packages/api/node_modules/.bin/tsx .scratch/padel-declared-band-trust/prototype/replay.ts
 */
import { applyIdleInflation } from "../../../packages/domain/src/idle";
import {
  bandFromLevel,
  confirmedPhiForOverride,
  INITIAL_PHI,
  INITIAL_SIGMA,
  LEVEL_BANDS,
  levelFromMu,
  muFromBand,
  muFromLevel,
  type LevelBand,
  type RatingGlickoState,
} from "../../../packages/domain/src/level";
import { displayLabelFromStoredBand } from "../../../packages/domain/src/level-bands";
import { rateDoublesMatch } from "../../../packages/domain/src/rate-doubles-match";

const GLICKO2_SCALE = 173.7178;
const DAY_MS = 24 * 60 * 60 * 1000;
const MATCHES_TO_CONFIRM = 5;
const PROVE_IT_FROM = LEVEL_BANDS.indexOf("C2");

type Rules = "today" | "new";
type Player = { id: string; declared: LevelBand | null; truth: number };
type State = RatingGlickoState & { lastRatedAt: Date | null };

type MatchEvent = {
  kind: "match";
  at: Date;
  matchId: number;
  userId: string;
  score: 0 | 1;
  weight: number;
  onGroup: boolean;
  muBefore: number;
  muAfter: number;
  phiAfter: number;
  sigmaAfter: number;
  proveItPart: number;
};
type OverrideEvent = {
  kind: "override";
  at: Date;
  userId: string;
  muBefore: number;
  muAfter: number;
  phiAfter: number;
};
type LedgerRow = MatchEvent | OverrideEvent;
type Seats = { slot1: [string, string]; slot2: [string, string] };

const PLAYERS: Player[] = [
  { id: "amal", declared: "D3", truth: 0.4 },
  { id: "bader", declared: "D3", truth: 0.5 },
  { id: "dana", declared: "D3", truth: 3.1 },
  { id: "essa", declared: "D1", truth: 1.8 },
  { id: "faris", declared: "C3", truth: 2.4 },
  { id: "ghada", declared: "C2", truth: 3.2 },
  { id: "hadi", declared: "C2", truth: 3.1 },
  { id: "isa", declared: "C1", truth: 2.4 },
  { id: "jana", declared: "C1", truth: 3.9 },
  { id: "khalid", declared: "B2", truth: 5.2 },
  { id: "lulwa", declared: null, truth: 2.9 },
  { id: "mona", declared: "C2", truth: 3.0 },
];

let seed = 20261116;
function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

function g(phi: number) {
  return 1 / Math.sqrt(1 + (3 * (phi / GLICKO2_SCALE) ** 2) / Math.PI ** 2);
}
function expectedScore(mu: number, opponentMu: number, opponentPhi: number) {
  return (
    1 / (1 + Math.exp((-g(opponentPhi) * (mu - opponentMu)) / GLICKO2_SCALE))
  );
}

function startPhi(band: LevelBand | null, rules: Rules) {
  if (rules === "today" || band === null) {
    return INITIAL_PHI;
  }
  const index = LEVEL_BANDS.indexOf(band);
  if (index <= LEVEL_BANDS.indexOf("D1")) {
    return 150;
  }
  return band === "C3" ? 200 : 250;
}

function startState(band: LevelBand | null, rules: Rules): State {
  return {
    mu: band ? muFromBand(band) : 1500,
    phi: startPhi(band, rules),
    sigma: INITIAL_SIGMA,
    levelBand: band ?? "C2",
    lastRatedAt: null,
  };
}

type Schedule = (
  | { kind: "match"; at: Date; matchId: number; seats: Seats; winner: 1 | 2; weight: number; onGroup: boolean }
  | { kind: "override"; at: Date; userId: string; level: number }
)[];

function makeSchedule(matches: number): Schedule {
  const schedule: Schedule = [];
  const start = new Date("2026-06-01T18:00:00Z").getTime();
  for (let index = 0; index < matches; index++) {
    const pool = [...PLAYERS].sort(() => random() - 0.5).slice(0, 4);
    const [a, b, c, d] = pool as [Player, Player, Player, Player];
    const pWin = expectedScore(
      muFromLevel((a.truth + b.truth) / 2),
      muFromLevel((c.truth + d.truth) / 2),
      100,
    );
    schedule.push({
      kind: "match",
      at: new Date(start + index * 2 * DAY_MS),
      matchId: index + 1,
      seats: { slot1: [a.id, b.id], slot2: [c.id, d.id] },
      winner: random() < pWin ? 1 : 2,
      weight: random() < 0.7 ? 1 : 0.5,
      onGroup: random() < 0.85,
    });
    if (index === 24) {
      schedule.push({
        kind: "override",
        at: new Date(start + index * 2 * DAY_MS + DAY_MS),
        userId: "dana",
        level: 2.6,
      });
    }
  }
  return schedule;
}

/** One pass over a schedule under one rule set: the live writer and the replay share it. */
function run(
  schedule: Schedule,
  declaredOf: (userId: string) => LevelBand | null,
  rules: Rules,
) {
  const states = new Map<string, State>();
  const counted = new Map<string, number>();
  const overridden = new Set<string>();
  const stateOf = (userId: string) => {
    const existing = states.get(userId);
    if (existing) {
      return existing;
    }
    const created = startState(declaredOf(userId), rules);
    states.set(userId, created);
    return created;
  };
  const ledger: LedgerRow[] = [];

  for (const unit of schedule) {
    if (unit.kind === "override") {
      const before = stateOf(unit.userId);
      const mu = muFromLevel(unit.level);
      const after: State = {
        ...before,
        mu,
        phi: confirmedPhiForOverride(before.phi),
        levelBand: bandFromLevel(unit.level),
      };
      states.set(unit.userId, after);
      overridden.add(unit.userId);
      ledger.push({
        kind: "override",
        at: unit.at,
        userId: unit.userId,
        muBefore: before.mu,
        muAfter: mu,
        phiAfter: after.phi,
      });
      continue;
    }

    const { seats, at } = unit;
    const inflatedPhi = (userId: string) =>
      applyIdleInflation(stateOf(userId), stateOf(userId).lastRatedAt, at).phi;
    const proveIt = (userId: string, partnerId: string, opponents: [string, string]) => {
      const declared = declaredOf(userId);
      if (
        rules === "today" ||
        declared === null ||
        LEVEL_BANDS.indexOf(declared) < PROVE_IT_FROM ||
        overridden.has(userId) ||
        (counted.get(userId) ?? 0) >= MATCHES_TO_CONFIRM
      ) {
        return false;
      }
      const expected = expectedScore(
        (stateOf(userId).mu + stateOf(partnerId).mu) / 2,
        (stateOf(opponents[0]).mu + stateOf(opponents[1]).mu) / 2,
        (inflatedPhi(opponents[0]) + inflatedPhi(opponents[1])) / 2,
      );
      return expected >= 0.25 && expected <= 0.75;
    };
    const input = (userId: string, partnerId: string, opponents: [string, string]) => ({
      state: stateOf(userId),
      lastRatedAt: stateOf(userId).lastRatedAt,
      lossFactor: proveIt(userId, partnerId, opponents) ? 1.5 : 1,
    });
    const [a, b] = seats.slot1;
    const [c, d] = seats.slot2;
    const rated = rateDoublesMatch({
      slot1: [input(a, b, seats.slot2), input(b, a, seats.slot2)],
      slot2: [input(c, d, seats.slot1), input(d, c, seats.slot1)],
      outcome: unit.winner === 1 ? "slot1" : "slot2",
      weight: unit.weight,
      now: at,
    });
    const results = [
      [a, rated.slot1[0]],
      [b, rated.slot1[1]],
      [c, rated.slot2[0]],
      [d, rated.slot2[1]],
    ] as const;
    for (const [userId, result] of results) {
      ledger.push({
        kind: "match",
        at,
        matchId: unit.matchId,
        userId,
        score: result.score === 1 ? 1 : 0,
        weight: unit.weight,
        onGroup: unit.onGroup,
        muBefore: result.before.mu,
        muAfter: result.after.mu,
        phiAfter: result.after.phi,
        sigmaAfter: result.after.sigma,
        proveItPart: result.reliabilityPart,
      });
      states.set(userId, {
        ...result.after,
        levelBand: result.levelBand,
        lastRatedAt: at,
      });
      if (unit.onGroup) {
        counted.set(userId, (counted.get(userId) ?? 0) + 1);
      }
    }
  }
  return { states, ledger };
}

/** What the replay reads back from a stored ledger: the declared band, the order, the seats, the outcome. */
function replayInputs(ledger: readonly LedgerRow[], seatsOf: Map<number, Seats>) {
  const firstMuBefore = new Map<string, number>();
  for (const row of ledger) {
    if (!firstMuBefore.has(row.userId)) {
      firstMuBefore.set(row.userId, row.muBefore);
    }
  }
  const declaredOf = (userId: string): LevelBand | null => {
    const mu = firstMuBefore.get(userId);
    return LEVEL_BANDS.find((band) => muFromBand(band) === mu) ?? null;
  };
  const schedule: Schedule = [];
  const seen = new Set<number>();
  for (const row of ledger) {
    if (row.kind === "override") {
      schedule.push({ kind: "override", at: row.at, userId: row.userId, level: levelFromMu(row.muAfter) });
      continue;
    }
    if (seen.has(row.matchId)) {
      continue;
    }
    seen.add(row.matchId);
    const seats = seatsOf.get(row.matchId);
    if (!seats) {
      throw new Error(`Match ${row.matchId} has no seats`);
    }
    schedule.push({
      kind: "match",
      at: row.at,
      matchId: row.matchId,
      seats,
      winner: seats.slot1.includes(row.userId) === (row.score === 1) ? 1 : 2,
      weight: row.weight,
      onGroup: row.onGroup,
    });
  }
  return { schedule, declaredOf };
}

function sameLedger(left: readonly LedgerRow[], right: readonly LedgerRow[]) {
  return (
    left.length === right.length &&
    left.every((row, index) => JSON.stringify(row) === JSON.stringify(right[index]))
  );
}

const schedule = makeSchedule(60);
const seatsOf = new Map(
  schedule.flatMap((unit) =>
    unit.kind === "match" ? [[unit.matchId, unit.seats] as const] : [],
  ),
);
const declared = (userId: string) =>
  PLAYERS.find((player) => player.id === userId)?.declared ?? null;

const stored = run(schedule, declared, "today");
const inputs = replayInputs(stored.ledger, seatsOf);
const replayed = run(inputs.schedule, inputs.declaredOf, "new");

const face = (mu: number) => Math.max(1, levelFromMu(mu)).toFixed(2);
console.log("Stored under today's rules, then replayed under Parts 1 and 2 (60 Matches, 12 players)\n");
console.log(
  ["player", "declared", "true", "matches", "stored", "band", "φ", "replayed", "band", "φ", "move"]
    .map((cell) => cell.padEnd(9))
    .join(""),
);
const moves: { id: string; move: number }[] = [];
let bandChanges = 0;
for (const player of PLAYERS) {
  const before = stored.states.get(player.id);
  const after = replayed.states.get(player.id);
  if (!before || !after) {
    continue;
  }
  const move = levelFromMu(after.mu) - levelFromMu(before.mu);
  moves.push({ id: player.id, move });
  const bandBefore = displayLabelFromStoredBand(before.levelBand);
  const bandAfter = displayLabelFromStoredBand(after.levelBand);
  bandChanges += bandBefore === bandAfter ? 0 : 1;
  console.log(
    [
      player.id,
      player.declared ? displayLabelFromStoredBand(player.declared) : "none",
      player.truth.toFixed(1),
      String(stored.ledger.filter((row) => row.kind === "match" && row.userId === player.id).length),
      face(before.mu),
      bandBefore,
      before.phi.toFixed(0),
      face(after.mu),
      bandAfter,
      after.phi.toFixed(0),
      (move >= 0 ? "+" : "") + move.toFixed(2),
    ]
      .map((cell) => cell.padEnd(9))
      .join(""),
  );
}
const sorted = [...moves].sort((a, b) => a.move - b.move);
const down = sorted[0];
const up = sorted[sorted.length - 1];
console.log(
  `\nMoved by 0.01 or more: ${moves.filter((row) => Math.abs(row.move) >= 0.01).length} of ${moves.length}. ` +
    `Largest down: ${down?.id} ${down?.move.toFixed(2)}. Largest up: ${up?.id} +${up?.move.toFixed(2)}. ` +
    `Band letter changed: ${bandChanges}.`,
);
console.log(
  `Losses the Prove-it rule made cost more: ${replayed.ledger.filter((row) => row.kind === "match" && row.proveItPart !== 0).length}.`,
);

const again = run(
  replayInputs(replayed.ledger, seatsOf).schedule,
  replayInputs(replayed.ledger, seatsOf).declaredOf,
  "new",
);
console.log(`\nA second replay changes nothing: ${sameLedger(replayed.ledger, again.ledger)}`);

const live = run(schedule, declared, "new");
const liveInputs = replayInputs(live.ledger, seatsOf);
const liveReplayed = run(liveInputs.schedule, liveInputs.declaredOf, "new");
console.log(
  `A history written under the new rules replays to itself exactly: ${sameLedger(live.ledger, liveReplayed.ledger)}`,
);
