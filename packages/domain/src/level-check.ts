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
 * The Level check: after a padel Match with a Rating window the other three
 * players say what band a player played at, and the verdict is blended into
 * their Level as one measurement weighed by their φ. The constants are
 * starting values and tunable (`.scratch/padel-declared-band-trust/spec.md`
 * §8.3).
 */
export const LEVEL_CHECK_R = 250;
/** 0.35 Level: the most one check moves μ, before the Game's weight. */
export const LEVEL_CHECK_CAP_MU = 175;
export const LEVEL_CHECK_MIN_BALLOTS = 2;

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

export function isLevelCheckBand(
  value: string,
): value is AssignableDisplayLevelBand {
  return LEVEL_CHECK_BANDS.some((band) => band === value);
}

/** One answer about a player: the band picked and whether an opponent picked it. */
export type LevelCheckPick = {
  band: AssignableDisplayLevelBand;
  fromOpponent: boolean;
  /** 1 unless a later rule weighs a rater down. */
  weight?: number;
};

export type LevelCheckVerdict =
  | { kind: "too_few"; ballotsCounted: number }
  | { kind: "no_opponent"; ballotsCounted: number }
  | { kind: "verdict"; level: number; ballotsCounted: number };

/**
 * The verdict on one player: the weighted median of the picks on the nine
 * display bands. With the weight split evenly across two bands, the mean of
 * their two middles. It takes two answers, one of them from the opposing
 * Game team.
 */
export function levelCheckVerdict(
  picks: readonly LevelCheckPick[],
): LevelCheckVerdict {
  const ballotsCounted = picks.length;
  if (ballotsCounted < LEVEL_CHECK_MIN_BALLOTS) {
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
  const weightOf = (pick: LevelCheckPick) => pick.weight ?? 1;
  const half = sorted.reduce((sum, pick) => sum + weightOf(pick), 0) / 2;
  let running = 0;
  for (const [index, pick] of sorted.entries()) {
    running += weightOf(pick);
    const level = LEVEL_CHECK_BAND_LEVELS[pick.band];
    if (Math.abs(running - half) <= HALF_TOLERANCE) {
      const next = sorted[index + 1];
      return {
        kind: "verdict",
        level: next ? (level + LEVEL_CHECK_BAND_LEVELS[next.band]) / 2 : level,
        ballotsCounted,
      };
    }
    if (running > half) {
      return { kind: "verdict", level, ballotsCounted };
    }
  }
  return { kind: "too_few", ballotsCounted };
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

export type LevelCheckStep = {
  /** The verdict was the band the player shows, so μ stays. */
  agreed: boolean;
  mu: number;
  phi: number;
  levelBand: LevelBand;
};

/**
 * One Level check as a measurement of the Level: μ moves by
 * `k × (μ_verdict − μ)` with `k = φ² / (φ² + r²)`, capped at 0.35 Level, and
 * φ narrows as by one more measurement; both are then blended by the Game's
 * weight. A verdict on the band the player shows moves no μ and only narrows
 * φ.
 */
export function levelCheckStep(
  state: { mu: number; phi: number; levelBand: LevelBand },
  verdictLevel: number,
  weight: number,
): LevelCheckStep {
  const agreed =
    levelCheckVerdictBand(verdictLevel) ===
    displayLabelFromStoredBand(state.levelBand);
  const variance = state.phi * state.phi;
  const measurement = LEVEL_CHECK_R * LEVEL_CHECK_R;
  const gain = variance / (variance + measurement);
  const move = agreed
    ? 0
    : Math.max(
        -LEVEL_CHECK_CAP_MU,
        Math.min(
          LEVEL_CHECK_CAP_MU,
          gain * (muFromLevel(verdictLevel) - state.mu),
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
      levelCheckVerdictBand(data.verdictLevelHundredths / 100),
    ),
    line: m.moved(padelLevel(data.muBefore), padelLevel(data.muAfter)),
  };
}
