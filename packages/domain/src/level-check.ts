import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  bandFromLevel,
  bandWithHysteresis,
  formatPadelLevel,
  levelFromMu,
  muFromLevel,
  type LevelBand,
} from "./level";
import {
  ASSIGNABLE_DISPLAY_LEVEL_BANDS,
  displayLabelFromStoredBand,
  type AssignableDisplayLevelBand,
} from "./level-bands";

/**
 * The Level check (ADR-0101): after a padel Match with a Rating window the
 * other three players say what band a player played at, and the verdict is
 * blended into their Level as one measurement weighed by their φ. The
 * constants are starting values and tunable. This one is the φ the verdict
 * carries as that measurement.
 */
export const LEVEL_CHECK_VERDICT_PHI = 250;
/** 0.35 Level: the most one check moves μ, before the Game's weight. */
export const LEVEL_CHECK_CAP_MU = 175;
export const LEVEL_CHECK_MIN_ANSWERS = 2;
/** A rater whose own padel Level is Provisional when the window settles (ADR-0080). */
export const LEVEL_CHECK_PROVISIONAL_RATER_WEIGHT = 0.5;
export const LEVEL_CHECK_OUTLIER_WEIGHT = 0.5;
/** Mean distance from the verdicts, in display bands, past which a Match counts against a rater. */
export const LEVEL_CHECK_OUTLIER_BANDS = 1.5;
export const LEVEL_CHECK_OUTLIER_MATCHES_RUNNING = 3;

export const LEVEL_CHECK_BANDS = ASSIGNABLE_DISPLAY_LEVEL_BANDS;

/** The middle of each display band's span; D covers the stored D3 and D2, 0.0 to 1.4. */
export const LEVEL_CHECK_BAND_LEVELS: Record<
  AssignableDisplayLevelBand,
  number
> = {
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

const HALF_TOLERANCE = 1e-9;

/** One answer about a player: the band picked and whether an opponent picked it. */
export type WeighedLevelCheckAnswer = {
  band: AssignableDisplayLevelBand;
  fromOpponent: boolean;
  /** 1 unless the rater is Provisional or an outlier. */
  weight?: number;
};

/** A counted answer on one Match, with who gave it and who it is about. */
export type LevelCheckAnswer = Omit<WeighedLevelCheckAnswer, "weight"> & {
  raterUserId: string;
  rateeUserId: string;
};

export type SettledLevelCheckVerdict = {
  kind: "verdict";
  level: number;
  /** The band the median fell on, or the two the weight split evenly across. */
  bands: readonly AssignableDisplayLevelBand[];
  ballotsCounted: number;
};

export type LevelCheckVerdict =
  | { kind: "too_few"; ballotsCounted: number }
  | { kind: "no_opponent"; ballotsCounted: number }
  | SettledLevelCheckVerdict;

function verdictAcross(
  bands: readonly AssignableDisplayLevelBand[],
  ballotsCounted: number,
): SettledLevelCheckVerdict {
  return {
    kind: "verdict",
    level:
      bands.reduce((sum, band) => sum + LEVEL_CHECK_BAND_LEVELS[band], 0) /
      bands.length,
    bands: [...new Set(bands)],
    ballotsCounted,
  };
}

/**
 * The verdict on one player: the weighted median of the picks on the nine
 * display bands. With the weight split evenly across two bands, the mean of
 * their two middles. It takes two answers, one of them from the opposing
 * Game team.
 */
export function levelCheckVerdict(
  picks: readonly WeighedLevelCheckAnswer[],
): LevelCheckVerdict {
  const ballotsCounted = picks.length;
  if (ballotsCounted < LEVEL_CHECK_MIN_ANSWERS) {
    return { kind: "too_few", ballotsCounted };
  }
  if (!picks.some((pick) => pick.fromOpponent)) {
    return { kind: "no_opponent", ballotsCounted };
  }
  const sorted = [...picks].sort(
    (left, right) =>
      LEVEL_CHECK_BANDS.indexOf(left.band) -
      LEVEL_CHECK_BANDS.indexOf(right.band),
  );
  const weightOf = (pick: WeighedLevelCheckAnswer) => pick.weight ?? 1;
  const half = sorted.reduce((sum, pick) => sum + weightOf(pick), 0) / 2;
  let running = 0;
  for (const [index, pick] of sorted.entries()) {
    running += weightOf(pick);
    if (Math.abs(running - half) <= HALF_TOLERANCE) {
      const next = sorted[index + 1];
      return verdictAcross(
        next ? [pick.band, next.band] : [pick.band],
        ballotsCounted,
      );
    }
    if (running > half) {
      return verdictAcross([pick.band], ballotsCounted);
    }
  }
  return { kind: "too_few", ballotsCounted };
}

/**
 * Each player's verdict on one Match, weighing each rater by `raterWeights`;
 * a rater missing from it weighs 1. The two-answer minimum and the opponent
 * rule count answers, not weights.
 */
export function levelCheckVerdicts(
  ballots: readonly LevelCheckAnswer[],
  raterWeights: ReadonlyMap<string, number> = new Map(),
): Map<string, LevelCheckVerdict> {
  const picks = new Map<string, WeighedLevelCheckAnswer[]>();
  for (const ballot of ballots) {
    const list = picks.get(ballot.rateeUserId) ?? [];
    list.push({
      band: ballot.band,
      fromOpponent: ballot.fromOpponent,
      weight: raterWeights.get(ballot.raterUserId) ?? 1,
    });
    picks.set(ballot.rateeUserId, list);
  }
  return new Map(
    [...picks].map(([userId, list]) => [userId, levelCheckVerdict(list)]),
  );
}

/**
 * Where each verdict Level a Match can reach sits on the nine display bands,
 * by its hundredths as `level_check_results` stores them: a band's index, or
 * halfway between two when the weight split evenly across them.
 */
const VERDICT_BAND_POSITIONS = new Map<number, number>(
  LEVEL_CHECK_BANDS.flatMap((low, lowIndex) =>
    LEVEL_CHECK_BANDS.slice(lowIndex).map(
      (high, offset) =>
        [
          levelCheckVerdictHundredths(
            (LEVEL_CHECK_BAND_LEVELS[low] + LEVEL_CHECK_BAND_LEVELS[high]) / 2,
          ),
          lowIndex + offset / 2,
        ] as const,
    ),
  ),
);

/** A verdict's place on the nine display bands, counting a split verdict as halfway. */
function levelCheckBandPosition(level: number): number {
  return (
    VERDICT_BAND_POSITIONS.get(levelCheckVerdictHundredths(level)) ??
    LEVEL_CHECK_BANDS.indexOf(levelCheckVerdictBand(level))
  );
}

/**
 * Each rater's mean distance, in display bands, from the verdicts on the
 * players they answered about. A rater none of whose players got a verdict
 * has no distance.
 */
export function levelCheckRaterDistances(
  ballots: readonly Pick<
    LevelCheckAnswer,
    "raterUserId" | "rateeUserId" | "band"
  >[],
  verdictLevels: ReadonlyMap<string, number>,
): Map<string, number> {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const ballot of ballots) {
    const level = verdictLevels.get(ballot.rateeUserId);
    if (level === undefined || ballot.raterUserId === ballot.rateeUserId) {
      continue;
    }
    const total = totals.get(ballot.raterUserId) ?? { sum: 0, count: 0 };
    total.sum += Math.abs(
      LEVEL_CHECK_BANDS.indexOf(ballot.band) - levelCheckBandPosition(level),
    );
    total.count += 1;
    totals.set(ballot.raterUserId, total);
  }
  return new Map(
    [...totals].map(([raterUserId, total]) => [
      raterUserId,
      total.sum / total.count,
    ]),
  );
}

/**
 * Each rater's mean distance in their previous Matches with a Level check,
 * newest first; null for a Match where none of the players they answered
 * about got a verdict.
 */
export type PreviousLevelCheckDistances = ReadonlyMap<
  string,
  readonly (number | null)[]
>;

function isFar(distance: number | null | undefined) {
  return distance != null && distance > LEVEL_CHECK_OUTLIER_BANDS;
}

function verdictLevels(verdicts: ReadonlyMap<string, LevelCheckVerdict>) {
  return new Map(
    [...verdicts].flatMap(([userId, verdict]) =>
      verdict.kind === "verdict" ? [[userId, verdict.level] as const] : [],
    ),
  );
}

/**
 * Each rater's weight in one Match's Level check: 1, half for a rater whose
 * own padel Level is Provisional, and half again for an outlier, a rater far
 * from the verdicts in this Match and in each of their previous two Matches
 * with a Level check. This Match's distance is measured against the verdicts
 * as they settle with the Provisional weights alone. Derived from the
 * answers every time, so nothing records a judgement of a rater (ADR-0068).
 */
export function levelCheckRaterWeights(
  ballots: readonly LevelCheckAnswer[],
  options: {
    provisionalRaterIds: ReadonlySet<string>;
    previousDistances: PreviousLevelCheckDistances;
  },
): Map<string, number> {
  const raters = new Set(ballots.map((ballot) => ballot.raterUserId));
  const weights = new Map(
    [...raters].map((raterUserId) => [
      raterUserId,
      options.provisionalRaterIds.has(raterUserId)
        ? LEVEL_CHECK_PROVISIONAL_RATER_WEIGHT
        : 1,
    ]),
  );
  const distances = levelCheckRaterDistances(
    ballots,
    verdictLevels(levelCheckVerdicts(ballots, weights)),
  );
  for (const [raterUserId, distance] of distances) {
    const earlier = (options.previousDistances.get(raterUserId) ?? []).slice(
      0,
      LEVEL_CHECK_OUTLIER_MATCHES_RUNNING - 1,
    );
    if (
      isFar(distance) &&
      earlier.length === LEVEL_CHECK_OUTLIER_MATCHES_RUNNING - 1 &&
      earlier.every(isFar)
    ) {
      weights.set(
        raterUserId,
        (weights.get(raterUserId) ?? 1) * LEVEL_CHECK_OUTLIER_WEIGHT,
      );
    }
  }
  return weights;
}

/** The display band a verdict's Level falls in. */
export function levelCheckVerdictBand(
  level: number,
): AssignableDisplayLevelBand {
  return displayLabelFromStoredBand(bandFromLevel(level));
}

export function levelCheckVerdictHundredths(level: number) {
  return Math.round(level * 100);
}

/** A verdict's Level from its hundredths, as `level_check_results` stores it. */
export function levelCheckVerdictLevel(verdictLevelHundredths: number) {
  return verdictLevelHundredths / 100;
}

export type LevelCheckStep = {
  /** The verdict agreed with the band the player shows, so μ stays. */
  agreed: boolean;
  mu: number;
  phi: number;
  levelBand: LevelBand;
};

/**
 * One Level check as a measurement of the Level: μ moves by
 * `k × (μ_verdict − μ)` with `k = φ² / (φ² + r²)`, capped at 0.35 Level, and
 * φ narrows as by one more measurement; both are then blended by the Game's
 * weight. A verdict that agrees with the band the player shows moves no μ and
 * only narrows φ: one on that band, or one split evenly across two bands of
 * which it is one. A split's Level, the mean of the two middles, reads as one
 * of the two bands or a third, so it is never compared alone (ADR-0101).
 */
export function levelCheckStep(
  state: { mu: number; phi: number; levelBand: LevelBand },
  verdict: Pick<SettledLevelCheckVerdict, "level" | "bands">,
  weight: number,
): LevelCheckStep {
  const agreed = verdict.bands.includes(
    displayLabelFromStoredBand(state.levelBand),
  );
  const variance = state.phi * state.phi;
  const measurement = LEVEL_CHECK_VERDICT_PHI * LEVEL_CHECK_VERDICT_PHI;
  const gain = variance / (variance + measurement);
  const move = agreed
    ? 0
    : Math.max(
        -LEVEL_CHECK_CAP_MU,
        Math.min(
          LEVEL_CHECK_CAP_MU,
          gain * (muFromLevel(verdict.level) - state.mu),
        ),
      );
  const mu = state.mu + weight * move;
  const narrowed = 1 / Math.sqrt(1 / variance + 1 / measurement);
  return {
    agreed,
    mu,
    phi: state.phi + weight * (narrowed - state.phi),
    levelBand: agreed
      ? state.levelBand
      : bandWithHysteresis(levelFromMu(mu), state.levelBand),
  };
}

/** A player the viewer may answer about on Rate the game, with the band they show. */
export type LevelCheckSheetPlayer = {
  userId: string;
  name: string;
  shownBand: AssignableDisplayLevelBand;
};

/** What `games.performanceRatingSheet` sends for the Level check; null when the Match asks none. */
export type LevelCheckSheet = {
  players: LevelCheckSheetPlayer[];
  /** The viewer's own answers; nobody else's are ever sent. */
  answers: { userId: string; band: AssignableDisplayLevelBand }[];
};

export type LevelCheckDraft = Readonly<
  Record<string, AssignableDisplayLevelBand>
>;

export function levelCheckDraft(sheet: LevelCheckSheet | null | undefined) {
  return Object.fromEntries(
    (sheet?.answers ?? []).map((row) => [row.userId, row.band]),
  ) as LevelCheckDraft;
}

/** Picking the band already picked clears it: a blank is not an answer. */
export function setLevelCheckAnswer(
  draft: LevelCheckDraft,
  userId: string,
  band: AssignableDisplayLevelBand,
): LevelCheckDraft {
  const next = { ...draft };
  if (next[userId] === band) {
    delete next[userId];
  } else {
    next[userId] = band;
  }
  return next;
}

/** What Submit sends: the viewer's whole set of answers. */
export function levelCheckSubmission(
  draft: LevelCheckDraft,
  sheet: LevelCheckSheet,
) {
  const players = new Set(sheet.players.map((player) => player.userId));
  return Object.entries(draft)
    .filter(([userId]) => players.has(userId))
    .map(([userId, band]) => ({ userId, band }));
}

export type LevelCheckCell = {
  band: AssignableDisplayLevelBand;
  selected: boolean;
  /** The band the player shows, which the row opens on. */
  now: boolean;
  spoken: string;
};

export type LevelCheckRow = {
  userId: string;
  question: string;
  answer: AssignableDisplayLevelBand | null;
  nowLabel: string;
  cells: LevelCheckCell[];
};

/** The question under each other player on Rate the game, keyed by player. */
export function levelCheckRows(
  sheet: LevelCheckSheet,
  draft: LevelCheckDraft,
  locale: Locale,
): Map<string, LevelCheckRow> {
  const m = messagesFor(locale).rating.levelCheck;
  return new Map(
    sheet.players.map((player) => {
      const answer = draft[player.userId] ?? null;
      return [
        player.userId,
        {
          userId: player.userId,
          question: m.question(player.name),
          answer,
          nowLabel: m.now,
          cells: LEVEL_CHECK_BANDS.map((band) => ({
            band,
            selected: answer === band,
            now: player.shownBand === band,
            spoken:
              player.shownBand === band
                ? m.bandSpokenNow(player.name, band)
                : m.bandSpoken(player.name, band),
          })),
        },
      ];
    }),
  );
}

/**
 * What `games.performanceRatingResult` says about the caller's own Level
 * check once the window has settled: the verdict and the move, or why
 * nothing settled.
 */
export type LevelCheckResultData =
  | {
      kind: "checked";
      agreed: boolean;
      verdictLevelHundredths: number;
      muBefore: number;
      muAfter: number;
      ballotsCounted: number;
    }
  | {
      kind: "unsettled";
      reason: "too_few" | "no_opponent";
      ballotsReceived: number;
      ballotsNeeded: number;
    };

export type LevelCheckResultView = {
  title: string;
  headline: string;
  /** The Level before and after; null when nothing moved it. */
  line: string | null;
};

function padelLevel(mu: number) {
  return formatPadelLevel(levelFromMu(mu), 2);
}

export function levelCheckResultView(
  data: LevelCheckResultData,
  locale: Locale,
): LevelCheckResultView {
  const m = messagesFor(locale).rating.levelCheck.result;
  if (data.kind === "unsettled") {
    return {
      title: m.title,
      headline:
        data.reason === "no_opponent"
          ? m.noOpponent
          : data.ballotsReceived === 0
            ? m.nobody(data.ballotsNeeded)
            : m.tooFew(data.ballotsReceived, data.ballotsNeeded),
      line: null,
    };
  }
  if (data.agreed) {
    return { title: m.title, headline: m.agreed, line: null };
  }
  return {
    title: m.title,
    headline: m.placed(
      levelCheckVerdictBand(
        levelCheckVerdictLevel(data.verdictLevelHundredths),
      ),
    ),
    line: m.moved(padelLevel(data.muBefore), padelLevel(data.muAfter)),
  };
}
