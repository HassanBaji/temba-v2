import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  formatOvr,
  formatOvrDelta,
  formatOvrPrecise,
  OVR_MAX,
  OVR_MIN,
  OVR_PART_WEIGHTS,
} from "./football-ovr";
import {
  gameRatingScopeLabel,
  groupRatingScopeNote,
  tembaRatingScopeNote,
  type GameRatingScope,
} from "./game-rating-scope";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";
import { formatPerformanceRating, MIN_BALLOTS } from "./performance-rating";

export function unratedLabel(locale: Locale) {
  return messagesFor(locale).common.unrated;
}

export function unratedGameLine(locale: Locale) {
  return messagesFor(locale).game.rating.unratedGameLine;
}

/**
 * A Game's Rating scope (ADR-0053). An endpoint that does not return the
 * scope yet only says whether the Game moves the Temba Level.
 */
export function ratingScopeOf(game: {
  rated: boolean;
  ratingScope?: GameRatingScope | null;
}): GameRatingScope {
  return game.ratingScope ?? (game.rated ? "temba" : "unrated");
}

/**
 * The tag a Game card or row carries: its scope, none when a padel Game is
 * Temba rated. A football Game that counts says so (ADR-0069), and so does a
 * Public Game, which counts only once both sides confirm (ADR-0071).
 */
export function ratingScopeTag(
  game: {
    rated: boolean;
    ratingScope?: GameRatingScope | null;
    sport?: string | null;
    publicGame?: boolean;
  },
  locale: Locale,
): string | null {
  const scope = ratingScopeOf(game);
  if (scope === "temba" && game.publicGame) {
    return messagesFor(locale).rating.scope.temba;
  }
  return scope === "temba" && game.sport !== "football"
    ? null
    : gameRatingScopeLabel(scope, locale, game.sport);
}

/**
 * The Game details notice for a Game that does not move the Temba Level, and
 * for a football Game or a Public Game that does.
 */
export function ratingScopeNotice(
  scope: GameRatingScope,
  locale: Locale,
  sport?: string | null,
  publicGame = false,
): { title: string; line: string } | null {
  if (scope === "temba" && publicGame) {
    const m = messagesFor(locale).rating;
    return { title: m.scope.temba, line: m.publicGame.countsNote };
  }
  if (scope === "temba" && sport !== "football") {
    return null;
  }
  return {
    title: gameRatingScopeLabel(scope, locale, sport),
    line:
      scope === "temba"
        ? tembaRatingScopeNote(locale, sport)
        : scope === "group"
          ? groupRatingScopeNote(locale, sport)
          : messagesFor(locale).game.rating.unratedGameLine,
  };
}

export type RatingImpactChangeDirection = "up" | "down" | "flat";

/** Absolute Level change, one decimal, sign-free (the arrow glyph carries sign). */
export function ratingImpactChangeMagnitude(levelChange: number): string {
  return Math.abs(levelChange).toFixed(1);
}

export function ratingImpactChangeDirection(
  levelChange: number,
): RatingImpactChangeDirection {
  if (levelChange > 0) {
    return "up";
  }
  if (levelChange < 0) {
    return "down";
  }
  return "flat";
}

/**
 * Standing-sentence copy for the Final-phase Rating impact block
 * (game-details redesign, TEM-182) — the block that explains why the
 * viewer's Home level card changed after this Match. Reuses the exact
 * Provisional/confirmed phrasing conventions already shipped on Home
 * (`.scratch/home-level-redesign/spec.md` §3.4, `home-level-block.tsx`)
 * rather than inventing new copy:
 * - "about" a remaining-games count, never a hard promise — the count is a
 *   linear estimate in φ that can rise after idle-inflation (ADR-0009), so
 *   promising an exact number is a support thread waiting to happen.
 * - "confirms"/"confirmed", never "locks in".
 *
 * The Level band renders through the shipped display remap (D / D+ / C /
 * … / A, PR #96), not the raw stored band, matching every other Level
 * surface (`home-level-block.tsx`, `game-lineup-section.tsx`).
 */
export function ratingImpactStandingSentence(args: {
  newLevelBand: LevelBand;
  isProvisional: boolean;
  ratedMatchesRemainingToConfirm: number | null;
  locale: Locale;
}): string {
  const m = messagesFor(args.locale).game.rating;
  const bandLabel = displayLabelFromStoredBand(args.newLevelBand);

  if (args.isProvisional) {
    const remaining = Math.max(1, args.ratedMatchesRemainingToConfirm ?? 1);
    return m.stillProvisional(bandLabel, remaining);
  }

  return m.stillConfirmed(bandLabel);
}

export function ratingImpactView(
  ratingImpact: {
    levelChange: number;
    newLevel: number;
    newLevelBand: LevelBand;
    isProvisional: boolean;
    ratedMatchesRemainingToConfirm: number | null;
  },
  locale: Locale,
) {
  const m = messagesFor(locale).game.rating;
  const direction = ratingImpactChangeDirection(ratingImpact.levelChange);
  const magnitude = ratingImpactChangeMagnitude(ratingImpact.levelChange);
  return {
    direction,
    magnitude,
    newLevelLabel: ratingImpact.newLevel.toFixed(1),
    sentence: ratingImpactStandingSentence({ ...ratingImpact, locale }),
    directionText:
      direction === "up"
        ? m.increasedBy(magnitude)
        : direction === "down"
          ? m.decreasedBy(magnitude)
          : m.unchanged,
  };
}

/** What a counting football Match did to the viewer's OVR (screen 5a). */
export type OvrImpact = {
  before: number;
  after: number;
  resultPart: number;
  outcome: "won" | "drew" | "lost";
  /** The other side's mean OVR before the Match. */
  opponentAverage: number;
  /**
   * The four parts of the move, in OVR points. A part is null on a Match
   * counted before it was written.
   */
  parts: {
    result: number;
    performance: number | null;
    goals: number | null;
    mvp: number | null;
  };
  /** The viewer's settled rating and how many ratings they received; null without one. */
  rating: { hundredths: number; ballots: number } | null;
  /** The viewer's own goals and their side's goals conceded. */
  goals: { scored: number; conceded: number } | null;
  /** Whether the viewer, someone else or nobody was voted MVP. */
  mvp: "you" | "other" | "none";
};

export type OvrImpactRow = {
  title: string;
  detail: string;
  delta: string;
  spoken: string;
};

export type OvrImpactView = {
  tag: string;
  title: string;
  /** "74 to 75", in whole OVR. */
  aside: string;
  rows: OvrImpactRow[];
  total: OvrImpactRow;
  /** "Keeping ratings honest", once the ratings are part of the move. */
  footnote: string | null;
};

function percentOf(share: number) {
  return Math.round(share * 100);
}

/**
 * Each part in tenths of OVR, rounded so the shown parts add up to the shown
 * move. What rounding leaves over goes to the part with the largest size, and
 * no part is ever shown with a sign the player did not earn: a part gives up
 * tenths only down to zero, then the next largest takes the rest.
 */
export function shownOvrParts(parts: readonly number[], move: number) {
  const tenths = parts.map((part) => Math.round(part * 10));
  let gap =
    Math.round(move * 10) - tenths.reduce((sum, value) => sum + value, 0);
  const largestFirst = parts
    .map((_, index) => index)
    .sort((a, b) => Math.abs(parts[b]!) - Math.abs(parts[a]!));
  for (const index of largestFirst) {
    if (gap === 0) {
      break;
    }
    const part = parts[index]!;
    if (part === 0) {
      continue;
    }
    const step =
      Math.sign(part) === Math.sign(gap)
        ? gap
        : Math.sign(gap) * Math.min(Math.abs(gap), Math.abs(tenths[index]!));
    tenths[index]! += step;
    gap -= step;
  }
  return tenths.map((value) => value / 10 + 0);
}

const OVR_BOUND_TOLERANCE = 1e-6;

/**
 * Where OVR's 40 floor or 99 ceiling cut a move short: the stored parts are
 * what the player earned, and the stored move is what OVR had room for.
 * Null when the move was not cut by at least a tenth.
 */
export function ovrMoveHeldAt(
  ovr: Pick<OvrImpact, "before" | "after" | "parts">,
) {
  const earned =
    ovr.parts.result +
    (ovr.parts.performance ?? 0) +
    (ovr.parts.goals ?? 0) +
    (ovr.parts.mvp ?? 0);
  const heldBack = ovr.after - ovr.before - earned;
  if (Math.round(Math.abs(heldBack) * 10) === 0) {
    return null;
  }
  if (heldBack > 0 && ovr.after <= OVR_MIN + OVR_BOUND_TOLERANCE) {
    return OVR_MIN;
  }
  if (heldBack < 0 && ovr.after >= OVR_MAX - OVR_BOUND_TOLERANCE) {
    return OVR_MAX;
  }
  return null;
}

/**
 * Screen 5a's "What moved your OVR": one row per part the Match wrote, then
 * the move in one decimal with where the Level stands. The shown rows add up
 * to the shown move. A move cut at the 40 floor or the 99 ceiling shows each
 * part as earned and one more row for what the bound held back.
 */
export function ovrImpactView(
  impact: {
    ovr: OvrImpact;
    newLevelBand: LevelBand;
    isProvisional: boolean;
    ratedMatchesRemainingToConfirm: number | null;
  },
  locale: Locale,
): OvrImpactView {
  const copy = messagesFor(locale).rating.ovrImpact;
  const { ovr } = impact;
  const move = ovr.after - ovr.before;
  const opponents = formatOvr(ovr.opponentAverage);

  const rows: { title: string; detail: string; part: number }[] = [
    {
      title: copy.result(percentOf(OVR_PART_WEIGHTS.result)),
      detail: copy.outcome[ovr.outcome](opponents),
      part: ovr.parts.result,
    },
  ];
  if (ovr.parts.performance !== null) {
    rows.push({
      title: copy.ratings(percentOf(OVR_PART_WEIGHTS.performance)),
      detail: ovr.rating
        ? copy.ratingFrom(
            formatPerformanceRating(ovr.rating.hundredths),
            ovr.rating.ballots,
          )
        : copy.noRating(MIN_BALLOTS),
      part: ovr.parts.performance,
    });
  }
  if (ovr.parts.goals !== null) {
    rows.push({
      title: copy.goals(percentOf(OVR_PART_WEIGHTS.goals)),
      detail: copy.goalsLine(ovr.goals?.scored ?? 0, ovr.goals?.conceded ?? 0),
      part: ovr.parts.goals,
    });
  }
  if (ovr.parts.mvp !== null) {
    rows.push({
      title: copy.mvp(percentOf(OVR_PART_WEIGHTS.mvp)),
      detail:
        ovr.mvp === "you"
          ? copy.mvpYou
          : ovr.mvp === "other"
            ? copy.mvpOther
            : copy.mvpNone,
      part: ovr.parts.mvp,
    });
  }
  const earned = rows.map((row) => row.part);
  const heldAt = ovrMoveHeldAt(ovr);
  const asEarned = earned.map((part) => Math.round(part * 10) / 10);
  const heldBack =
    (Math.round(move * 10) -
      asEarned.reduce((sum, part) => sum + Math.round(part * 10), 0)) /
    10;
  const held =
    heldAt !== null && Math.sign(heldBack) === (heldAt === OVR_MIN ? 1 : -1)
      ? { at: heldAt, amount: heldBack }
      : null;
  const shown = held ? asEarned : shownOvrParts(earned, move);

  const totalTitle = copy.move(
    formatOvrPrecise(ovr.before),
    formatOvrPrecise(ovr.after),
  );
  const totalDelta = formatOvrDelta(move);
  const shownRows = rows.map((row, index) => ({
    title: row.title,
    detail: row.detail,
    delta: formatOvrDelta(shown[index] ?? 0),
  }));
  if (held) {
    const bound = formatOvr(held.at);
    shownRows.push({
      title: copy.heldAt(bound),
      detail:
        held.at === OVR_MIN ? copy.heldFloor(bound) : copy.heldCeiling(bound),
      delta: formatOvrDelta(held.amount),
    });
  }
  return {
    tag: gameRatingScopeLabel("temba", locale, "football"),
    title: copy.title,
    aside: copy.move(formatOvr(ovr.before), formatOvr(ovr.after)),
    rows: shownRows.map((row) => ({
      ...row,
      spoken: copy.spoken(row.title, row.delta),
    })),
    total: {
      title: totalTitle,
      detail: ratingImpactStandingSentence({ ...impact, locale }),
      delta: totalDelta,
      spoken: copy.spoken(totalTitle, totalDelta),
    },
    footnote: ovr.parts.performance === null ? null : copy.honest,
  };
}
