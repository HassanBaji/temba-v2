/**
 * Planning prototype for `.scratch/padel-declared-band-trust/spec.md`. Not
 * production code. Re-runs the owner's six cases through the real
 * `rateDoublesMatch`, then adds a level check in five shapes, to answer two
 * questions the design doc's simulation left open: what a band pick (not a
 * continuous verdict) does to an honest player, and what switching the check
 * off at confirmation costs.
 *
 * Run from the Workspace root:
 *   packages/api/node_modules/.bin/tsx .scratch/padel-declared-band-trust/prototype/simulate.ts
 */
import {
  bandFromLevel,
  bandWithHysteresis,
  levelFromMu,
  muFromLevel,
  type LevelBand,
} from "../../../packages/domain/src/level";
import { displayLabelFromStoredBand } from "../../../packages/domain/src/level-bands";
import { rateDoublesMatch } from "../../../packages/domain/src/rate-doubles-match";

const GLICKO2_SCALE = 173.7178;
const CHECK_R = 250;
const CHECK_CAP_MU = 175;
const RATER_NOISE_LEVEL = 0.4;
const RUNS = 3000;
const MATCHES = 9;
const MATCHES_TO_CONFIRM = 5;
const NOW = new Date("2026-11-16T12:00:00Z");

const DISPLAY = ["D", "D+", "C-", "C", "C+", "B-", "B", "B+", "A"] as const;
type Display = (typeof DISPLAY)[number];

/** The middle of each display band's span; "D" covers the stored D3 and D2. */
const DISPLAY_MIDPOINT: Record<Display, number> = {
  D: 0.7,
  "D+": 1.75,
  "C-": 2.45,
  C: 3.15,
  "C+": 3.85,
  "B-": 4.55,
  B: 5.25,
  "B+": 5.95,
  A: 6.65,
};

type Mode =
  | "today"
  | "part1"
  | "part1+2"
  | "continuous"
  | "band"
  | "band+agree"
  | "lower/higher"
  | "off at confirm";

const MODES: Mode[] = [
  "today",
  "part1",
  "part1+2",
  "continuous",
  "band",
  "band+agree",
  "lower/higher",
  "off at confirm",
];

let seed = 12345;
function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
function gaussian() {
  return (
    Math.sqrt(-2 * Math.log(random() + 1e-12)) * Math.cos(2 * Math.PI * random())
  );
}

function g(phi: number) {
  return 1 / Math.sqrt(1 + (3 * (phi / GLICKO2_SCALE) ** 2) / Math.PI ** 2);
}
function expectedScore(mu: number, opponentMu: number, opponentPhi: number) {
  return (
    1 / (1 + Math.exp((-g(opponentPhi) * (mu - opponentMu)) / GLICKO2_SCALE))
  );
}

function startPhi(declaredLevel: number, mode: Mode) {
  if (mode === "today") {
    return 350;
  }
  if (declaredLevel < 2.1) {
    return 150;
  }
  return declaredLevel < 2.8 ? 200 : 250;
}

function displayOf(level: number): Display {
  return displayLabelFromStoredBand(bandFromLevel(level));
}

function settledPlayer(level: number) {
  return {
    state: {
      mu: muFromLevel(level),
      phi: 100,
      sigma: 0.06,
      levelBand: bandFromLevel(level),
    },
    lastRatedAt: null,
  };
}

function hasCheck(mode: Mode, matchIndex: number) {
  if (mode === "today" || mode === "part1" || mode === "part1+2") {
    return false;
  }
  return mode !== "off at confirm" || matchIndex < MATCHES_TO_CONFIRM;
}

/** The verdict Level of three noisy raters, or null when they agree with the shown band. */
function verdictLevel(
  mode: Mode,
  truth: number,
  level: number,
  shownBand: LevelBand,
): number | null {
  const seen = [0, 1, 2].map(() =>
    Math.min(7, Math.max(0, truth + RATER_NOISE_LEVEL * gaussian())),
  );
  if (mode === "continuous") {
    return [...seen].sort((a, b) => a - b)[1] ?? null;
  }
  const shown = displayLabelFromStoredBand(shownBand);
  const picks = seen
    .map(displayOf)
    .sort((a, b) => DISPLAY.indexOf(a) - DISPLAY.indexOf(b));
  const median = picks[1] ?? shown;
  if (mode === "lower/higher") {
    const direction = Math.sign(DISPLAY.indexOf(median) - DISPLAY.indexOf(shown));
    return direction === 0 ? null : level + direction * 0.7;
  }
  if (mode !== "band" && median === shown) {
    return null;
  }
  return DISPLAY_MIDPOINT[median];
}

function run(declared: number, truth: number, mode: Mode) {
  let state = {
    mu: muFromLevel(declared),
    phi: startPhi(declared, mode),
    sigma: 0.06,
    levelBand: bandFromLevel(declared),
  };
  const others = muFromLevel(declared);
  for (let index = 0; index < MATCHES; index++) {
    const won =
      random() <
      expectedScore(muFromLevel((truth + declared) / 2), others, 100);
    const expected = expectedScore((state.mu + others) / 2, others, 100);
    const proveIt =
      mode !== "today" &&
      mode !== "part1" &&
      declared >= 2.8 &&
      index < MATCHES_TO_CONFIRM &&
      !won &&
      expected >= 0.25 &&
      expected <= 0.75;
    const rated = rateDoublesMatch({
      slot1: [
        { state, lastRatedAt: null, lossFactor: proveIt ? 1.5 : 1 },
        settledPlayer(declared),
      ],
      slot2: [settledPlayer(declared), settledPlayer(declared)],
      outcome: won ? "slot1" : "slot2",
      weight: 1,
      now: NOW,
    }).slot1[0];
    state = { ...rated.after, levelBand: rated.levelBand };

    if (!hasCheck(mode, index)) {
      continue;
    }
    const verdict = verdictLevel(
      mode,
      truth,
      levelFromMu(state.mu),
      state.levelBand,
    );
    const variance = state.phi * state.phi;
    const gain = variance / (variance + CHECK_R * CHECK_R);
    const move =
      verdict === null
        ? 0
        : Math.max(
            -CHECK_CAP_MU,
            Math.min(CHECK_CAP_MU, gain * (muFromLevel(verdict) - state.mu)),
          );
    const mu = state.mu + move;
    state = {
      mu,
      phi: 1 / Math.sqrt(1 / variance + 1 / (CHECK_R * CHECK_R)),
      sigma: state.sigma,
      levelBand: bandWithHysteresis(levelFromMu(mu), state.levelBand),
    };
  }
  return levelFromMu(state.mu);
}

const CASES: [name: string, declared: number, truth: number][] = [
  ["Honest D (0.35)", 0.35, 0.35],
  ["Says D, plays 1.05 (still D)", 0.35, 1.05],
  ["Says D, plays C (3.15)", 0.35, 3.15],
  ["Honest C (3.15)", 3.15, 3.15],
  ["Honest C, top of band (3.45)", 3.15, 3.45],
  ["Says C+, plays C- (2.45)", 3.85, 2.45],
  ["Honest B (5.25)", 5.25, 5.25],
];

console.log(
  `Level after ${MATCHES} matches, mean of ${RUNS} runs. Others in the Match sit at the declared Level, φ 100.`,
);
console.log(
  "case".padEnd(30),
  MODES.map((mode) => mode.padStart(15)).join(""),
);
for (const [name, declared, truth] of CASES) {
  const cells = MODES.map((mode) => {
    let total = 0;
    for (let index = 0; index < RUNS; index++) {
      total += run(declared, truth, mode);
    }
    return (total / RUNS).toFixed(2).padStart(15);
  });
  console.log(name.padEnd(30), cells.join(""));
}
