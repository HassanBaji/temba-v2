import {
  clampLevel,
  INITIAL_MU,
  INITIAL_PHI,
  isProvisional,
  levelFromMu,
  muFromLevel,
} from "./level";
import {
  DEFAULT_FOOTBALL_POSITION,
  type FootballPosition,
  type FootballRole,
} from "./football-lineup";
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

/** The labels under the football level scale, lowest to highest. */
export const OVR_SCALE_TICKS = [40, 55, 70, 85, 99] as const;

/** How far along the 40 to 99 scale an OVR sits, to one decimal. */
export function ovrScalePercent(ovr: number) {
  return (
    Math.round(((clampOvr(ovr) - OVR_MIN) / (OVR_MAX - OVR_MIN)) * 1000) / 10
  );
}

/** OVR is always shown as a whole number. */
export function formatOvr(ovr: number) {
  return String(Math.round(clampOvr(ovr)));
}

/** The whole-number OVR of a stored μ, as every surface shows it. */
export function wholeOvrFromMu(mu: number) {
  return Math.round(ovrFromMu(mu));
}

/**
 * What Make teams balances a player on outside a tier Group: their
 * whole-number OVR, or a new Rating's (Level 3.0, OVR 65) when they have
 * none, as the Level slider starts.
 */
export function ovrBalanceStrength(mu: number | null | undefined) {
  return wholeOvrFromMu(mu ?? INITIAL_MU);
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

/** How much a player answers for the goals their side concedes. */
export type FootballGoalsRole = "keeper" | FootballPosition;

export const OVR_GOALS_ROLE_WEIGHTS: Record<FootballGoalsRole, number> = {
  keeper: 1,
  def: 0.75,
  mid: 0.4,
  fwd: 0.2,
};

/** A keeper answers as a keeper; an outfield player by Position, midfield when unset. */
export function footballGoalsRole(
  role: FootballRole | null | undefined,
  position: FootballPosition | null | undefined,
): FootballGoalsRole {
  return role === "keeper" ? "keeper" : (position ?? DEFAULT_FOOTBALL_POSITION);
}

export type FootballMatchPlayer = {
  userId: string;
  mu: number;
  phi: number;
  /** Own named goals. */
  goals?: number;
  goalsRole?: FootballGoalsRole;
  /** The Performance-rating score in −1 to 1; absent or null without a settled rating. */
  performance?: number | null;
};

export type FootballMatchMove = {
  userId: string;
  side: 1 | 2;
  score: 0 | 0.5 | 1;
  /** The side's expected score against the other side's mean OVR. */
  expected: number;
  ovrBefore: number;
  ovrAfter: number;
  /** Each part in OVR points; together they make the move before the clamp. */
  resultPart: number;
  performancePart: number;
  goalsPart: number;
  mvpPart: number;
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

function clampScore(value: number) {
  return Math.min(1, Math.max(-1, value));
}

export function footballExpectedScore(ownMean: number, otherMean: number) {
  return 1 / (1 + 10 ** ((otherMean - ownMean) / OVR_RESULT_SCALE));
}

/**
 * The goals score of each player, in −1 to 1. No minutes are recorded, so
 * "while they played" is the whole Match: own
 * named goals against the Match's mean per player, minus the side's goals
 * conceded against half the Match total, the conceded part weighed by
 * Football role. Both are counted in halves of the Match total, so a side
 * that concedes every goal puts its keeper at −1. A goalless Match scores 0.
 */
export function footballGoalsScores(
  players: readonly {
    userId: string;
    side: 1 | 2;
    goals?: number;
    goalsRole?: FootballGoalsRole;
  }[],
  score: { slot1: number; slot2: number },
): Map<string, number> {
  const half = (score.slot1 + score.slot2) / 2;
  const scores = new Map<string, number>();
  if (half <= 0 || players.length === 0) {
    return scores;
  }
  const meanNamed =
    players.reduce((sum, player) => sum + (player.goals ?? 0), 0) /
    players.length;
  for (const player of players) {
    const conceded = player.side === 1 ? score.slot2 : score.slot1;
    const roleWeight =
      OVR_GOALS_ROLE_WEIGHTS[player.goalsRole ?? DEFAULT_FOOTBALL_POSITION];
    scores.set(
      player.userId,
      clampScore(
        ((player.goals ?? 0) - meanNamed - roleWeight * (conceded - half)) /
          half,
      ),
    );
  }
  return scores;
}

/**
 * The MVP score: +1 for an MVP decided by vote, `−1 / (n − 1)` for each
 * other player. No MVP, or one not on the Match, scores nobody.
 */
export function footballMvpScores(
  userIds: readonly string[],
  votedMvpUserId: string | null | undefined,
): Map<string, number> {
  const scores = new Map<string, number>();
  if (!votedMvpUserId || !userIds.includes(votedMvpUserId)) {
    return scores;
  }
  const others = userIds.length - 1;
  for (const userId of userIds) {
    scores.set(userId, userId === votedMvpUserId ? 1 : -1 / others);
  }
  return scores;
}

/**
 * One part in OVR points: `K × weight × share × (score − m)`, where `m` is
 * the K-weighted mean score of the players the part counts, so the part sums
 * to zero across the Match even when Provisional players move twice as far.
 * A player the part does not count gets 0, and nobody else takes up their
 * share.
 */
function zeroSumPart(
  entries: readonly { userId: string; k: number }[],
  scores: ReadonlyMap<string, number>,
  scale: number,
): Map<string, number> {
  const counted = entries.filter((entry) => scores.has(entry.userId));
  const weights = counted.reduce((sum, entry) => sum + entry.k, 0);
  const parts = new Map<string, number>();
  if (weights === 0) {
    return parts;
  }
  const mean =
    counted.reduce(
      (sum, entry) => sum + entry.k * (scores.get(entry.userId) ?? 0),
      0,
    ) / weights;
  for (const entry of counted) {
    parts.set(
      entry.userId,
      entry.k * scale * ((scores.get(entry.userId) ?? 0) - mean),
    );
  }
  return parts;
}

/**
 * The OVR step of a counting football Match (ADR-0069), written when its
 * Rating window settles: `K × weight × (0.4 × result + 0.3 × ratings + 0.2 ×
 * goals + 0.1 × MVP)`, K 6 while Provisional. Each part sums to zero across
 * the Match, so the mean OVR cannot drift. For the result part each side's
 * raw parts are scaled so both sides carry the same total; with even sides of
 * confirmed players nothing is scaled. The other three parts are centred on
 * the players they count. A part with no input (no score, no settled rating,
 * no MVP decided by vote) is 0. OVR is clamped to 40 to 99.
 */
export function rateFootballMatch(input: {
  slot1: readonly FootballMatchPlayer[];
  slot2: readonly FootballMatchPlayer[];
  outcome: FootballOutcome;
  weight: number;
  /** The Match's Score; without it the goals part is 0. */
  score?: { slot1: number; slot2: number } | null;
  votedMvpUserId?: string | null;
}): FootballMatchMove[] {
  if (input.slot1.length === 0 || input.slot2.length === 0) {
    return [];
  }
  const kOf = (player: FootballMatchPlayer) =>
    isProvisional(player.phi) ? OVR_K_PROVISIONAL : OVR_K;
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
        kOf(player) *
        input.weight *
        OVR_PART_WEIGHTS.result *
        (score - expected),
    }));
    const total = Math.abs(raw.reduce((sum, entry) => sum + entry.part, 0));
    return { side, score, expected, raw, total };
  });
  const transfer = sides.reduce((sum, side) => sum + side.total, 0) / 2;

  const seated = [
    ...input.slot1.map((player) => ({ player, side: 1 as const })),
    ...input.slot2.map((player) => ({ player, side: 2 as const })),
  ];
  const entries = seated.map(({ player }) => ({
    userId: player.userId,
    k: kOf(player),
  }));
  const performanceScores = new Map(
    seated.flatMap(({ player }) =>
      player.performance == null
        ? []
        : [[player.userId, clampScore(player.performance)] as const],
    ),
  );
  const goalsScores = input.score
    ? footballGoalsScores(
        seated.map(({ player, side }) => ({
          userId: player.userId,
          side,
          goals: player.goals,
          goalsRole: player.goalsRole,
        })),
        input.score,
      )
    : new Map<string, number>();
  const mvpScores = footballMvpScores(
    entries.map((entry) => entry.userId),
    input.votedMvpUserId,
  );
  const performance = zeroSumPart(
    entries,
    performanceScores,
    input.weight * OVR_PART_WEIGHTS.performance,
  );
  const goals = zeroSumPart(
    entries,
    goalsScores,
    input.weight * OVR_PART_WEIGHTS.goals,
  );
  const mvp = zeroSumPart(
    entries,
    mvpScores,
    input.weight * OVR_PART_WEIGHTS.mvp,
  );

  return sides.flatMap(({ side, score, expected, raw, total }) =>
    raw.map(({ player, part }) => {
      const resultPart = total > 0 ? (part * transfer) / total : 0;
      const performancePart = performance.get(player.userId) ?? 0;
      const goalsPart = goals.get(player.userId) ?? 0;
      const mvpPart = mvp.get(player.userId) ?? 0;
      const ovrBefore = ovrFromMu(player.mu);
      return {
        userId: player.userId,
        side,
        score,
        expected,
        ovrBefore,
        ovrAfter: clampOvr(
          ovrBefore + resultPart + performancePart + goalsPart + mvpPart,
        ),
        resultPart,
        performancePart,
        goalsPart,
        mvpPart,
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
