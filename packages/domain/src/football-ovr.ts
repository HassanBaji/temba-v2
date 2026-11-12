import {
  clampLevel,
  INITIAL_PHI,
  isProvisional,
  levelFromMu,
  muFromLevel,
} from "./level";
import type { Sport } from "./sport";

/**
 * Football reads the Temba Level as OVR 40 to 99 (ADR-0069): a face of the
 * stored Level, so no Rating row is rewritten.
 */
export const OVR_MIN = 40;
export const OVR_MAX = 99;

const LEVEL_MAX = 7;

/** How a sport shows its Level: padel as the 0.0 to 7.0 Level, football as OVR. */
export type LevelFace = "level" | "ovr";

export function levelFaceFor(sport: Sport): LevelFace {
  return sport === "football" ? "ovr" : "level";
}

function clampOvr(ovr: number) {
  return Math.min(OVR_MAX, Math.max(OVR_MIN, ovr));
}

export function ovrFromLevel(level: number) {
  return OVR_MIN + ((OVR_MAX - OVR_MIN) * clampLevel(level)) / LEVEL_MAX;
}

export function levelFromOvr(ovr: number) {
  return ((clampOvr(ovr) - OVR_MIN) * LEVEL_MAX) / (OVR_MAX - OVR_MIN);
}

export function ovrFromMu(mu: number) {
  return ovrFromLevel(levelFromMu(mu));
}

export function muFromOvr(ovr: number) {
  return muFromLevel(levelFromOvr(ovr));
}

/** OVR is always shown as a whole number. */
export function formatOvr(ovr: number) {
  return String(Math.round(clampOvr(ovr)));
}

/** OVR points per counting Match, before the Game's weight and the parts. */
export const OVR_K = 3;
export const OVR_K_PROVISIONAL = 6;
/** The result part's scale: a side 20 OVR stronger expects to win 10 to 1. */
export const OVR_RESULT_SCALE = 20;
/** Each part's share of the step (ADR-0069). */
export const OVR_PART_WEIGHTS = {
  result: 0.4,
  performance: 0.3,
  goals: 0.2,
  mvp: 0.1,
} as const;

/** Counting football Matches until a Level is confirmed. */
export const FOOTBALL_MATCHES_TO_CONFIRM = 5;
const FOOTBALL_PHI_CONFIRMED = 150;
const FOOTBALL_PHI_STEP = 30;

/**
 * Football's Provisional is a count of counting Matches, stored in φ so every
 * reader of Provisional keeps working: 350 before any, 30 less each, and 150
 * (confirmed) from the fifth.
 */
export function footballPhiAfterMatches(counted: number) {
  if (counted >= FOOTBALL_MATCHES_TO_CONFIRM) {
    return FOOTBALL_PHI_CONFIRMED;
  }
  return INITIAL_PHI - FOOTBALL_PHI_STEP * Math.max(0, counted);
}

export type FootballOutcome = "slot1" | "slot2" | "draw";

export type FootballMatchPlayer = {
  userId: string;
  mu: number;
  phi: number;
};

export type FootballMatchMove = {
  userId: string;
  side: 1 | 2;
  score: 0 | 0.5 | 1;
  /** The side's expected score against the other side's mean OVR. */
  expected: number;
  ovrBefore: number;
  ovrAfter: number;
  /** In OVR points. */
  resultPart: number;
};

function sideScore(outcome: FootballOutcome, side: 1 | 2): 0 | 0.5 | 1 {
  if (outcome === "draw") {
    return 0.5;
  }
  return outcome === `slot${side}` ? 1 : 0;
}

function meanOvr(players: readonly FootballMatchPlayer[]) {
  return (
    players.reduce((sum, player) => sum + ovrFromMu(player.mu), 0) /
    players.length
  );
}

export function footballExpectedScore(ownMean: number, otherMean: number) {
  return 1 / (1 + 10 ** ((otherMean - ownMean) / OVR_RESULT_SCALE));
}

/**
 * The OVR step of a counting football Match (ADR-0069). This version moves
 * the result part only: `K × weight × 0.4 × (S − E)`, K 6 while Provisional.
 * Each side's raw parts are scaled so both sides carry the same total, which
 * keeps the part zero-sum when the sides differ in size or mix Provisional
 * players; with even sides of confirmed players nothing is scaled. OVR is
 * clamped to 40 to 99.
 */
export function rateFootballMatch(input: {
  slot1: readonly FootballMatchPlayer[];
  slot2: readonly FootballMatchPlayer[];
  outcome: FootballOutcome;
  weight: number;
}): FootballMatchMove[] {
  if (input.slot1.length === 0 || input.slot2.length === 0) {
    return [];
  }
  const means = { 1: meanOvr(input.slot1), 2: meanOvr(input.slot2) };
  const sides = (
    [
      [1, input.slot1],
      [2, input.slot2],
    ] as const
  ).map(([side, players]) => {
    const score = sideScore(input.outcome, side);
    const expected = footballExpectedScore(
      means[side],
      means[side === 1 ? 2 : 1],
    );
    const raw = players.map((player) => ({
      player,
      part:
        (isProvisional(player.phi) ? OVR_K_PROVISIONAL : OVR_K) *
        input.weight *
        OVR_PART_WEIGHTS.result *
        (score - expected),
    }));
    const total = Math.abs(raw.reduce((sum, entry) => sum + entry.part, 0));
    return { side, score, expected, raw, total };
  });
  const transfer = sides.reduce((sum, side) => sum + side.total, 0) / 2;

  return sides.flatMap(({ side, score, expected, raw, total }) =>
    raw.map(({ player, part }) => {
      const resultPart = total > 0 ? (part * transfer) / total : 0;
      const ovrBefore = ovrFromMu(player.mu);
      return {
        userId: player.userId,
        side,
        score,
        expected,
        ovrBefore,
        ovrAfter: clampOvr(ovrBefore + resultPart),
        resultPart,
      };
    }),
  );
}

/** One decimal, for a move's before and after. */
export function formatOvrPrecise(ovr: number) {
  return clampOvr(ovr).toFixed(1);
}

/** A signed OVR move in one decimal: "+0.6", "−0.6", "0". */
export function formatOvrDelta(delta: number) {
  const tenths = Math.round(delta * 10);
  if (tenths > 0) {
    return `+${(tenths / 10).toFixed(1)}`;
  }
  if (tenths < 0) {
    return `−${(-tenths / 10).toFixed(1)}`;
  }
  return "0";
}
