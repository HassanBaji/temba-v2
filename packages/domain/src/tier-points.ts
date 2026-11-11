import { ovrFromLevel } from "./football-ovr";

/**
 * Tier points (ADR-0067): a whole number per member of a tier Group, moved
 * once per Match by a result part and a performance part. The constants are
 * starting values and tunable (`.scratch/rating-redesign/spec.md` §8.1).
 */

export const TIER_POINTS_START = 1200;
export const TIER_K = 32;
export const TIER_K_PROVISIONAL = 48;
export const TIER_SCALE = 400;
export const TIER_PROVISIONAL_GAMES = 5;
export const TIER_ADJUST_MAX_STEP = 400;
export const TIER_HINT_POINTS_PER_OVR = 10;

export type TierMatchResult = "slot1" | "slot2" | "draw";

export type TierMatchPlayer = {
  userId: string;
  points: number;
  provisional: boolean;
  /**
   * The player's performance against their usual, already centred on the
   * Match, in −1 to 1. Absent when they have no settled rating.
   */
  performance?: number | null;
};

export type TierMatchDelta = {
  userId: string;
  slot: 1 | 2;
  expectedScore: number;
  resultDelta: number;
  performanceDelta: number;
  delta: number;
};

/** The chance the side at `ownMean` beats the side at `oppMean`. */
export function tierExpectedScore(ownMean: number, oppMean: number) {
  return 1 / (1 + 10 ** ((oppMean - ownMean) / TIER_SCALE));
}

/** Rounds half away from zero, so a step and its opposite cancel exactly. */
function roundSymmetric(value: number) {
  return Math.sign(value) * Math.round(Math.abs(value)) + 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function mean(players: readonly TierMatchPlayer[]) {
  if (players.length === 0) {
    return TIER_POINTS_START;
  }
  return (
    players.reduce((sum, player) => sum + player.points, 0) / players.length
  );
}

function outcomeScore(result: TierMatchResult, slot: 1 | 2) {
  if (result === "draw") {
    return 0.5;
  }
  return (result === "slot1") === (slot === 1) ? 1 : 0;
}

/**
 * One delta per player of a football Match. The expectation is on the mean
 * Tier points of each side; `weight` is the share of the step that comes
 * from Performance ratings (0 when the Group's ratings are Off). No goal
 * margin multiplier.
 */
export function tierMatchDeltas(args: {
  slot1: readonly TierMatchPlayer[];
  slot2: readonly TierMatchPlayer[];
  result: TierMatchResult;
  weight?: number;
}): TierMatchDelta[] {
  const weight = args.weight ?? 0;
  const slot1Mean = mean(args.slot1);
  const slot2Mean = mean(args.slot2);
  const side = (
    players: readonly TierMatchPlayer[],
    slot: 1 | 2,
    ownMean: number,
    oppMean: number,
  ) => {
    const expectedScore = tierExpectedScore(ownMean, oppMean);
    const score = outcomeScore(args.result, slot);
    return players.map((player): TierMatchDelta => {
      const k = player.provisional ? TIER_K_PROVISIONAL : TIER_K;
      const resultDelta = roundSymmetric(
        (1 - weight) * k * (score - expectedScore),
      );
      const performance =
        player.performance == null ? 0 : clamp(player.performance, -1, 1);
      const performanceDelta = roundSymmetric(weight * k * performance);
      return {
        userId: player.userId,
        slot,
        expectedScore,
        resultDelta,
        performanceDelta,
        delta: resultDelta + performanceDelta,
      };
    });
  };
  return [
    ...side(args.slot1, 1, slot1Mean, slot2Mean),
    ...side(args.slot2, 2, slot2Mean, slot1Mean),
  ];
}

/** The ranked members a start hint is read against (`tierHintReference`). */
export type TierHintReference = {
  medianPoints: number;
  medianOvr: number;
  minPoints: number;
  maxPoints: number;
};

/**
 * Where a member's Temba Level suggests their Tier points start: the Group's
 * median points plus ten per OVR point above the Group's median OVR, kept
 * inside the Group's range. A suggestion only (D13): nothing writes it
 * without an Organizer.
 */
export function tierStartHint(args: {
  ovr: number;
  groupMedianPoints: number;
  groupMedianOvr: number;
  groupMinPoints: number;
  groupMaxPoints: number;
}) {
  const raw =
    args.groupMedianPoints +
    TIER_HINT_POINTS_PER_OVR * (args.ovr - args.groupMedianOvr);
  return Math.round(clamp(raw, args.groupMinPoints, args.groupMaxPoints));
}

/** The hint for a member with this OVR, or null without an OVR or a reference. */
export function tierHintFor(
  ovr: number | null,
  reference: TierHintReference | null,
) {
  if (ovr == null || reference == null) {
    return null;
  }
  return tierStartHint({
    ovr,
    groupMedianPoints: reference.medianPoints,
    groupMedianOvr: reference.medianOvr,
    groupMinPoints: reference.minPoints,
    groupMaxPoints: reference.maxPoints,
  });
}

/**
 * The OVR a start hint reads: a football Group Level an Organizer set earlier
 * wins over the Temba Level, and is never copied into Tier points.
 */
export function tierHintOvr(levels: {
  level: number | null;
  groupLevel: number | null;
}) {
  const level = levels.groupLevel ?? levels.level;
  return level == null || Number.isNaN(level) ? null : ovrFromLevel(level);
}
