import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  footballBibName,
  type FootballBib,
  type FootballPosition,
  type FootballRole,
} from "./football-lineup";
import {
  formatGameClock,
  formatGameDay,
  formatWeekday,
} from "./format-game-start";
import { formatTierPoints, tierPointsCount } from "./group-members-table";
import { initials } from "./initials";
import { productDaysBetween } from "./product-timezone";
import { formatTierDelta } from "./tier-adjust";
import type { TierBand } from "./tier-bands";
import { TIER_PROVISIONAL_GAMES } from "./tier-points";

/**
 * Performance ratings (ADR-0068): a 1 to 10 score one player of a football
 * Match gives another, settled when the Match's Rating window closes. The
 * constants are starting values and tunable (`.scratch/rating-redesign/spec.md`
 * §8.3).
 */

export const RATING_WINDOW_HOURS = 24;
export const PERFORMANCE_RATING_MIN = 1;
export const PERFORMANCE_RATING_MAX = 10;
export const ORDINARY_PERFORMANCE_RATING = 6;
export const MIN_BALLOTS = 3;
export const TRIM_FROM_BALLOTS = 5;
export const USUAL_PRIOR_GAMES = 3;
export const USUAL_RECENT_GAMES = 10;
export const ORGANIZER_DOUBLE_WEIGHT = 2;
export const OUTLIER_MEAN_DISTANCE = 2;
export const OUTLIER_GAMES_RUNNING = 3;
export const OUTLIER_WEIGHT_FACTOR = 0.5;

export const PERFORMANCE_RATING_VALUES: readonly number[] = Array.from(
  { length: PERFORMANCE_RATING_MAX - PERFORMANCE_RATING_MIN + 1 },
  (_, index) => PERFORMANCE_RATING_MIN + index,
);

/** Who rates on a Match that has a Rating window: never Off. */
export type RatingWindowMode = "organizer" | "everyone";

export function isPerformanceRatingValue(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= PERFORMANCE_RATING_MIN &&
    value <= PERFORMANCE_RATING_MAX
  );
}

export function ratingWindowClosesAt(completedAt: Date) {
  return new Date(completedAt.getTime() + RATING_WINDOW_HOURS * 3_600_000);
}

/**
 * `due` is a window whose close has passed but that nobody settled yet: the
 * Job is late, and the next read settles it.
 */
export type RatingWindowState = "open" | "due" | "settled" | "suspended";

export function ratingWindowState(
  window: {
    closesAt: Date | string;
    settledAt: Date | string | null;
    suspendedAt: Date | string | null;
  },
  now: Date,
): RatingWindowState {
  if (window.settledAt) {
    return "settled";
  }
  if (window.suspendedAt) {
    return "suspended";
  }
  return new Date(window.closesAt).getTime() <= now.getTime() ? "due" : "open";
}

/** In Everyone mode a player needs three ballots; the Organizer's one is enough. */
export function minBallotsFor(mode: RatingWindowMode) {
  return mode === "everyone" ? MIN_BALLOTS : 1;
}

/** An Organizer's ballot counts twice when everyone rates and the setting is on. */
export function raterWeight(args: {
  mode: RatingWindowMode;
  organizerCountsDouble: boolean;
  raterIsOrganizer: boolean;
}) {
  return args.mode === "everyone" &&
    args.organizerCountsDouble &&
    args.raterIsOrganizer
    ? ORGANIZER_DOUBLE_WEIGHT
    : 1;
}

export type PerformanceBallot = {
  raterUserId: string;
  rateeUserId: string;
  value: number;
};

export type SettledPerformanceRating = {
  userId: string;
  rating: number;
  ballotsCounted: number;
};

function byValueThenRater(left: PerformanceBallot, right: PerformanceBallot) {
  return (
    left.value - right.value ||
    left.raterUserId.localeCompare(right.raterUserId)
  );
}

function isCountedBallot(
  ballot: PerformanceBallot,
  raterWeights: ReadonlyMap<string, number>,
) {
  return (
    ballot.raterUserId !== ballot.rateeUserId &&
    isPerformanceRatingValue(ballot.value) &&
    (raterWeights.get(ballot.raterUserId) ?? 1) > 0
  );
}

function settleAtWeights(
  ballots: readonly PerformanceBallot[],
  raterWeights: ReadonlyMap<string, number>,
  mode: RatingWindowMode,
): SettledPerformanceRating[] {
  const byRatee = new Map<string, PerformanceBallot[]>();
  for (const ballot of ballots) {
    if (!isCountedBallot(ballot, raterWeights)) {
      continue;
    }
    const list = byRatee.get(ballot.rateeUserId) ?? [];
    list.push(ballot);
    byRatee.set(ballot.rateeUserId, list);
  }

  const settled: SettledPerformanceRating[] = [];
  for (const [userId, list] of byRatee) {
    if (list.length < minBallotsFor(mode)) {
      continue;
    }
    const sorted = [...list].sort(byValueThenRater);
    const counted =
      sorted.length >= TRIM_FROM_BALLOTS ? sorted.slice(1, -1) : sorted;
    let weighted = 0;
    let weights = 0;
    for (const ballot of counted) {
      const weight = raterWeights.get(ballot.raterUserId) ?? 1;
      weighted += weight * ballot.value;
      weights += weight;
    }
    settled.push({
      userId,
      rating: weighted / weights,
      ballotsCounted: counted.length,
    });
  }
  return settled.sort((left, right) => left.userId.localeCompare(right.userId));
}

/**
 * Each rater's mean distance from the settled ratings of the players they
 * rated. A rater none of whose players settled has no distance.
 */
export function raterDistances(
  ballots: readonly PerformanceBallot[],
  settled: readonly Pick<SettledPerformanceRating, "userId" | "rating">[],
): Map<string, number> {
  const ratingOf = new Map(settled.map((row) => [row.userId, row.rating]));
  const totals = new Map<string, { sum: number; count: number }>();
  for (const ballot of ballots) {
    const rating = ratingOf.get(ballot.rateeUserId);
    if (
      rating === undefined ||
      ballot.raterUserId === ballot.rateeUserId ||
      !isPerformanceRatingValue(ballot.value)
    ) {
      continue;
    }
    const total = totals.get(ballot.raterUserId) ?? { sum: 0, count: 0 };
    total.sum += Math.abs(ballot.value - rating);
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
 * Each rater's mean distance in their previous Matches, newest first; null
 * for a Match where none of the players they rated settled.
 */
export type PreviousRaterDistances = ReadonlyMap<
  string,
  readonly (number | null)[]
>;

function isFar(distance: number | null | undefined) {
  return distance != null && distance > OUTLIER_MEAN_DISTANCE;
}

/**
 * The raters whose ratings were far from the settled ones in this Match and
 * in each of their previous two (D19). This Match's distance is measured
 * against the ratings as they settle at full weight. Derived from the
 * ballots every time, so there is no record of who.
 */
export function outlierRaterIds(
  ballots: readonly PerformanceBallot[],
  raterWeights: ReadonlyMap<string, number>,
  options: {
    mode: RatingWindowMode;
    previousDistances: PreviousRaterDistances;
  },
): Set<string> {
  const counted = ballots.filter((ballot) =>
    isCountedBallot(ballot, raterWeights),
  );
  const distances = raterDistances(
    counted,
    settleAtWeights(counted, raterWeights, options.mode),
  );
  const outliers = new Set<string>();
  for (const [raterUserId, distance] of distances) {
    const earlier = (options.previousDistances.get(raterUserId) ?? []).slice(
      0,
      OUTLIER_GAMES_RUNNING - 1,
    );
    if (
      isFar(distance) &&
      earlier.length === OUTLIER_GAMES_RUNNING - 1 &&
      earlier.every(isFar)
    ) {
      outliers.add(raterUserId);
    }
  }
  return outliers;
}

/**
 * Each rated player's settled rating: the weighted mean of their ballots,
 * dropping the highest and the lowest from five ballots up. A player with
 * fewer ballots than the mode needs has no settled rating. A ballot to
 * oneself never counts; a rater missing from `raterWeights` weighs 1. Given
 * the raters' previous distances, an outlier rater's weight is halved.
 */
export function settlePerformanceRatings(
  ballots: readonly PerformanceBallot[],
  raterWeights: ReadonlyMap<string, number> = new Map(),
  options: {
    mode: RatingWindowMode;
    previousDistances?: PreviousRaterDistances;
  } = { mode: "everyone" },
): SettledPerformanceRating[] {
  if (!options.previousDistances) {
    return settleAtWeights(ballots, raterWeights, options.mode);
  }
  const outliers = outlierRaterIds(ballots, raterWeights, {
    mode: options.mode,
    previousDistances: options.previousDistances,
  });
  if (outliers.size === 0) {
    return settleAtWeights(ballots, raterWeights, options.mode);
  }
  const weights = new Map(raterWeights);
  for (const raterUserId of outliers) {
    weights.set(
      raterUserId,
      (raterWeights.get(raterUserId) ?? 1) * OUTLIER_WEIGHT_FACTOR,
    );
  }
  return settleAtWeights(ballots, weights, options.mode);
}

/** The mean settled rating of a Match, or null when nobody was rated. */
export function gameAverageRating(
  settled: readonly Pick<SettledPerformanceRating, "rating">[],
) {
  if (settled.length === 0) {
    return null;
  }
  return settled.reduce((sum, row) => sum + row.rating, 0) / settled.length;
}

/**
 * A player's usual rating: their last ten settled ratings, newest first,
 * shrunk towards an ordinary game as if they had three more of 6.
 */
export function usualRating(pastNewestFirst: readonly number[]) {
  const recent = pastNewestFirst.slice(0, USUAL_RECENT_GAMES);
  const sum = recent.reduce((total, value) => total + value, 0);
  return (
    (USUAL_PRIOR_GAMES * ORDINARY_PERFORMANCE_RATING + sum) /
    (USUAL_PRIOR_GAMES + recent.length)
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Each rated player's performance score in −1 to 1: their rating against
 * their usual, minus the Match's mean of that difference, so a generous
 * rating day nets to about zero (D20).
 */
export function performanceScores(
  players: readonly { userId: string; rating: number; usual: number }[],
): Map<string, number> {
  const scores = new Map<string, number>();
  if (players.length === 0) {
    return scores;
  }
  const shift =
    players.reduce((sum, player) => sum + (player.rating - player.usual), 0) /
    players.length;
  for (const player of players) {
    scores.set(
      player.userId,
      clamp(player.rating - player.usual - shift, -1, 1),
    );
  }
  return scores;
}

export function toHundredths(value: number) {
  return Math.round(value * 100);
}

export function fromHundredths(value: number) {
  return value / 100;
}

/** A player row of screen 4a, where the Organizer rates everyone. */
export type RateGamePlayer = {
  userId: string;
  name: string;
  role: FootballRole | null;
  position: FootballPosition | null;
  isViewer: boolean;
};

export type RateGameSheet = {
  mode: RatingWindowMode;
  weightPercent: number;
  state: "open" | "settled" | "suspended";
  closesAt: Date | string;
  groupName: string | null;
  venueName: string | null;
  windowStart: Date | string | null;
  score: { slot1: number; slot2: number } | null;
  bibs: { slot1: FootballBib; slot2: FootballBib };
  viewerSide: 1 | 2 | null;
  viewerIsOrganizer: boolean;
  slot1: RateGamePlayer[];
  slot2: RateGamePlayer[];
  /** The viewer's own ballots; nobody else's are ever sent. */
  ratings: { userId: string; value: number }[];
  /** How many of the seated account holders have rated, never who gave what. */
  progress: { raters: number; players: number };
  mvp: { pickable: boolean; userId: string | null };
};

export type RateGameDraft = {
  values: Readonly<Record<string, number>>;
  mvpUserId: string | null;
};

export function rateGameDraft(sheet: RateGameSheet): RateGameDraft {
  return {
    values: Object.fromEntries(
      sheet.ratings.map((row) => [row.userId, row.value]),
    ),
    mvpUserId: sheet.mvp.userId,
  };
}

/** Picking the value a player already has clears it: a blank is not a zero. */
export function setDraftRating(
  draft: RateGameDraft,
  userId: string,
  value: number,
): RateGameDraft {
  const values = { ...draft.values };
  if (values[userId] === value) {
    delete values[userId];
  } else if (isPerformanceRatingValue(value)) {
    values[userId] = value;
  }
  return { ...draft, values };
}

/**
 * The star picks the MVP. A picked MVP can be moved to another player but not
 * taken away, because `marks.setMvp` has no clear.
 */
export function toggleDraftMvp(
  draft: RateGameDraft,
  sheet: RateGameSheet,
  userId: string,
): RateGameDraft {
  if (!sheet.mvp.pickable) {
    return draft;
  }
  if (draft.mvpUserId === userId) {
    return sheet.mvp.userId === userId ? draft : { ...draft, mvpUserId: null };
  }
  return { ...draft, mvpUserId: userId };
}

function rateablePlayers(sheet: RateGameSheet) {
  return [...sheet.slot1, ...sheet.slot2].filter((player) => !player.isViewer);
}

/** What Submit sends: the viewer's whole ballot set, and an MVP to set if it changed. */
export function rateGameSubmission(draft: RateGameDraft, sheet: RateGameSheet) {
  const rateable = new Set(rateablePlayers(sheet).map((row) => row.userId));
  return {
    ratings: Object.entries(draft.values)
      .filter(([userId]) => rateable.has(userId))
      .map(([userId, value]) => ({ userId, value })),
    mvpUserId:
      sheet.mvp.pickable &&
      draft.mvpUserId !== null &&
      draft.mvpUserId !== sheet.mvp.userId
        ? draft.mvpUserId
        : null,
  };
}

export type RateGameCell = {
  value: number;
  state: "selected" | "below" | "above";
  spoken: string;
};

export type RateGameRow = {
  userId: string;
  initials: string;
  name: string;
  detail: string | null;
  value: number | null;
  valueLabel: string;
  spoken: string;
  cells: RateGameCell[];
  star: { on: boolean; spoken: string } | null;
};

export type RateGameSide = {
  slot: 1 | 2;
  bib: FootballBib;
  name: string;
  /** Beside the open side's name: the result, or "your side" when everyone rates. */
  aside: string | null;
  ratedLine: string;
  collapsedLine: string;
  showLabel: string;
  hideLabel: string;
  openByDefault: boolean;
  rows: RateGameRow[];
  self: {
    initials: string;
    name: string;
    playerName: string;
    note: string;
  } | null;
};

export type RateGameView = {
  title: string;
  hero: {
    sport: string;
    groupName: string | null;
    status: string;
    slot1: { bib: FootballBib; name: string };
    slot2: { bib: FootballBib; name: string };
    score: string | null;
    line: string | null;
  };
  /** When everyone rates: when the window closes, and how many have rated. */
  privacy: { title: string; description: string } | null;
  heading: string;
  headingAside: string;
  sides: RateGameSide[];
  footnote: string;
  footer: { title: string; subline: string | null; submit: string };
  notice: { title: string; description: string } | null;
  canSubmit: boolean;
  submitted: string;
};

function playerDetail(player: RateGamePlayer, locale: Locale) {
  const m = messagesFor(locale);
  if (player.role === "keeper") {
    return m.rating.performance.keeper;
  }
  return player.position ? m.football.lineup.positions[player.position] : null;
}

function sideResult(
  score: RateGameSheet["score"],
  slot: 1 | 2,
  locale: Locale,
) {
  if (!score) {
    return null;
  }
  const m = messagesFor(locale).rating.performance.side;
  const own = slot === 1 ? score.slot1 : score.slot2;
  const other = slot === 1 ? score.slot2 : score.slot1;
  return own > other ? m.won : own < other ? m.lost : m.drew;
}

function heroLine(
  sheet: RateGameSheet,
  bibName: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale).rating.performance.hero;
  const place = [
    sheet.windowStart
      ? formatGameDay(sheet.windowStart, locale, { weekday: "short" })
      : null,
    sheet.venueName,
  ]
    .filter((part): part is string => Boolean(part))
    .join(m.placeSeparator);
  const who =
    sheet.mode === "organizer" && sheet.viewerIsOrganizer
      ? m.youOrganized
      : bibName
        ? m.youPlayedIn(bibName)
        : null;
  if (!place) {
    return who;
  }
  return who ? m.line(place, who) : place;
}

/** `Closes tomorrow, 8:30 PM`, on the product clock. */
function closesLine(closesAt: Date | string, now: Date, locale: Locale) {
  const m = messagesFor(locale).rating.performance.everyone;
  const clock = formatGameClock(closesAt, locale);
  const days = productDaysBetween(now, new Date(closesAt));
  if (days <= 0) {
    return m.closesToday(clock);
  }
  if (days === 1) {
    return m.closesTomorrow(clock);
  }
  return m.closesOn(formatWeekday(closesAt, "short", locale), clock);
}

/** `hidden until tomorrow`, or the clock when it closes today. */
function hiddenUntil(closesAt: Date | string, now: Date, locale: Locale) {
  const m = messagesFor(locale).rating.performance.everyone.footer;
  const days = productDaysBetween(now, new Date(closesAt));
  if (days <= 0) {
    return formatGameClock(closesAt, locale);
  }
  if (days === 1) {
    return m.untilTomorrow;
  }
  return formatWeekday(closesAt, "short", locale);
}

/**
 * Screen 4a when the Organizer rates everyone, screen 4b when everyone rates
 * their teammates and, if they want, their opponents.
 */
export function rateGameView(
  sheet: RateGameSheet,
  draft: RateGameDraft,
  locale: Locale,
  now: Date = new Date(),
): RateGameView {
  const messages = messagesFor(locale);
  const m = messages.rating.performance;
  const everyone = sheet.mode === "everyone";
  const names = {
    slot1: footballBibName(sheet.bibs.slot1, 1, locale),
    slot2: footballBibName(sheet.bibs.slot2, 2, locale),
  };
  const open = sheet.state === "open";
  const firstSlot: 1 | 2 = sheet.viewerSide ?? 1;
  const nameOf = new Map(
    [...sheet.slot1, ...sheet.slot2].map((player) => [
      player.userId,
      player.name,
    ]),
  );

  const row = (player: RateGamePlayer): RateGameRow => {
    const value = draft.values[player.userId] ?? null;
    return {
      userId: player.userId,
      initials: initials(player.name),
      name: player.name,
      detail: playerDetail(player, locale),
      value,
      valueLabel: value === null ? m.notRated : String(value),
      spoken:
        value === null
          ? m.notRatedSpoken(player.name)
          : m.valueSpoken(player.name, value),
      cells: PERFORMANCE_RATING_VALUES.map((cell) => ({
        value: cell,
        state:
          value === cell
            ? "selected"
            : value !== null && cell < value
              ? "below"
              : "above",
        spoken: m.cellSpoken(player.name, cell),
      })),
      star: sheet.mvp.pickable
        ? {
            on: draft.mvpUserId === player.userId,
            spoken: m.mvpSpoken(player.name),
          }
        : null,
    };
  };

  const side = (slot: 1 | 2): RateGameSide => {
    const players = slot === 1 ? sheet.slot1 : sheet.slot2;
    const rateable = players.filter((player) => !player.isViewer);
    const viewer = players.find((player) => player.isViewer) ?? null;
    const rated = rateable.filter(
      (player) => draft.values[player.userId] !== undefined,
    ).length;
    const name = slot === 1 ? names.slot1 : names.slot2;
    const ownSide = slot === sheet.viewerSide;
    return {
      slot,
      bib: slot === 1 ? sheet.bibs.slot1 : sheet.bibs.slot2,
      name,
      aside: everyone
        ? ownSide
          ? m.everyone.yourSide
          : m.everyone.optional
        : sideResult(sheet.score, slot, locale),
      ratedLine: m.side.ratedOf(rated, rateable.length),
      collapsedLine:
        rated > 0
          ? m.side.ratedOf(rated, rateable.length)
          : everyone && !ownSide
            ? m.everyone.opponentsOptional(rateable.length)
            : m.side.notRatedYet(rateable.length),
      showLabel: m.side.show(name),
      hideLabel: m.side.hide(name),
      openByDefault: slot === firstSlot,
      rows: rateable.map(row),
      self: viewer
        ? {
            initials: initials(viewer.name),
            name: m.you,
            playerName: viewer.name,
            note: everyone ? m.everyone.selfNote : m.selfNote,
          }
        : null,
    };
  };

  const sides = firstSlot === 1 ? [side(1), side(2)] : [side(2), side(1)];
  const rateable = rateablePlayers(sheet);
  const ratedCount = rateable.filter(
    (player) => draft.values[player.userId] !== undefined,
  ).length;
  const mvpName =
    draft.mvpUserId === null ? null : (nameOf.get(draft.mvpUserId) ?? null);

  return {
    title: m.title,
    hero: {
      sport: messages.common.football,
      groupName: sheet.groupName,
      status: m.hero.final,
      slot1: { bib: sheet.bibs.slot1, name: names.slot1 },
      slot2: { bib: sheet.bibs.slot2, name: names.slot2 },
      score: sheet.score
        ? m.hero.score(sheet.score.slot1, sheet.score.slot2)
        : null,
      line: heroLine(
        sheet,
        sheet.viewerSide === null
          ? null
          : sheet.viewerSide === 1
            ? names.slot1
            : names.slot2,
        locale,
      ),
    },
    privacy: everyone
      ? {
          title: closesLine(sheet.closesAt, now, locale),
          description: m.everyone.privacy(
            sheet.progress.raters,
            sheet.progress.players,
          ),
        }
      : null,
    heading: everyone ? m.everyone.heading : m.heading,
    headingAside: sides[0]!.ratedLine,
    sides,
    footnote: everyone
      ? m.everyone.footnote
      : sheet.mvp.pickable
        ? `${m.footnote(sheet.weightPercent)} ${m.footnoteStar}`
        : m.footnote(sheet.weightPercent),
    footer: everyone
      ? {
          title:
            ratedCount === 0
              ? m.everyone.footer.nothingYet
              : m.everyone.footer.hiddenUntil(
                  ratedCount,
                  hiddenUntil(sheet.closesAt, now, locale),
                ),
          subline: m.everyone.footer.change,
          submit: m.everyone.footer.send,
        }
      : {
          title: m.footer.ratedOf(ratedCount, rateable.length),
          subline: mvpName
            ? m.footer.mvp(mvpName)
            : sheet.mvp.pickable
              ? m.footer.noMvp
              : null,
          submit: m.footer.submit,
        },
    notice:
      sheet.state === "settled"
        ? m.closed
        : sheet.state === "suspended"
          ? m.suspended
          : null,
    canSubmit: open,
    submitted: everyone ? m.everyone.submitted : m.submitted,
  };
}

/** `Fri 8:30 PM`, on the product clock. */
export function formatRatingWindowClose(
  closesAt: Date | string,
  locale: Locale,
) {
  return `${formatWeekday(closesAt, "short", locale)} ${formatGameClock(closesAt, locale)}`;
}

/** The card on a played Game that opens screen 4a or 4b, while the viewer may rate. */
export function rateGameEntry(
  window: {
    mode: RatingWindowMode;
    state: RatingWindowState;
    closesAt: Date | string;
    viewerMayRate: boolean;
  } | null,
  locale: Locale,
) {
  if (!window || !window.viewerMayRate || window.state !== "open") {
    return null;
  }
  const m = messagesFor(locale).rating.performance.entry;
  const closes = formatRatingWindowClose(window.closesAt, locale);
  return {
    title: m.title,
    description:
      window.mode === "organizer" ? m.organizer(closes) : m.everyone(closes),
    cta: m.cta,
  };
}

/** `7.4`: a settled rating, one decimal. */
export function formatPerformanceRating(hundredths: number) {
  return (hundredths / 100).toFixed(1);
}

/** Why a settled window gave the player no performance part. */
export type NoPerformanceReason =
  | "organizer_rated"
  | "organizer_did_not_rate"
  | "too_few_ballots";

/**
 * What `games.performanceRatingResult` returns: the closing time, and once
 * the window has settled the caller's own rating and what it did to their
 * Tier points (screen 4c). `result` is null before the window settles, for a
 * viewer who did not play, and for a Match that moved nobody's points.
 */
export type PerformanceRatingResultData = {
  state: "open" | "suspended" | "settled";
  mode: RatingWindowMode;
  closesAt: Date | string;
  played: boolean;
  /** The window moves OVR, shown on the Game as "What moved your OVR", not here. */
  countsForLevel?: boolean;
  result: {
    groupName: string | null;
    windowStart: Date | string | null;
    score: { slot1: number; slot2: number } | null;
    bibs: { slot1: FootballBib; slot2: FootballBib };
    viewerSide: 1 | 2;
    weightPercent: number;
    rating: {
      hundredths: number;
      usualHundredths: number | null;
      /** Every ballot the player received, before the highest and lowest went. */
      ballotsReceived: number;
      trimmed: boolean;
      organizerCountedDouble: boolean;
      gameAverageHundredths: number;
    } | null;
    noRating: { reason: NoPerformanceReason; ballotsReceived: number } | null;
    resultDelta: number;
    performanceDelta: number;
    delta: number;
    pointsBefore: number;
    pointsAfter: number;
    /** The player's side's expected score, from both sides' mean points. */
    expectedScore: number | null;
    tier: {
      bandBefore: TierBand | null;
      bandAfter: TierBand | null;
      placeBefore: number | null;
      /** Null while Provisional. */
      placeAfter: number | null;
      rankedCount: number | null;
      gamesOfFive: number;
      /** Set only while the player still holds the place this Match gave. */
      nextBand: TierBand | null;
      pointsToNextBand: number | null;
    };
    mvp: {
      name: string;
      isViewer: boolean;
      decidedBy: "vote" | "organizer" | "tie_break";
      votes: { for: number; cast: number } | null;
      ratingHundredths: number | null;
    } | null;
  } | null;
};

export type PerformanceResultRow = {
  title: string;
  detail: string;
  delta: string;
  spoken: string;
};

export type PerformanceResultView =
  | { kind: "pending"; title: string; description: string }
  | {
      kind: "settled";
      groupName: string | null;
      gameLine: string;
      scoreLine: string | null;
      rating: {
        value: string;
        ofTen: string;
        spoken: string;
        note: string;
      } | null;
      points: {
        title: string;
        aside: string | null;
        rows: [PerformanceResultRow, PerformanceResultRow];
        total: PerformanceResultRow;
      };
      tier: {
        title: string;
        aside: string;
        /** The four fish, lowest first; null while Provisional or too few ranked. */
        track: { band: TierBand; label: string; current: boolean }[] | null;
        provisional: boolean;
        line: string;
      };
      mvp: { title: string; detail: string | null } | null;
      footnote: string;
    };

function resultOnSide(
  score: { slot1: number; slot2: number } | null,
  side: 1 | 2,
  locale: Locale,
) {
  const copy = messagesFor(locale).rating.performance.result.outcome;
  if (!score) {
    return copy.played;
  }
  const own = side === 1 ? score.slot1 : score.slot2;
  const other = side === 1 ? score.slot2 : score.slot1;
  const line = `${own}–${other}`;
  return own > other
    ? copy.won(line)
    : own < other
      ? copy.lost(line)
      : copy.drew(line);
}

function resultDetail(
  result: NonNullable<PerformanceRatingResultData["result"]>,
  locale: Locale,
) {
  const copy = messagesFor(locale).rating.performance.result.outcome;
  const outcome = resultOnSide(result.score, result.viewerSide, locale);
  const expected = result.expectedScore;
  if (expected == null) {
    return outcome;
  }
  if (expected < 0.5) {
    return copy.againstStronger(outcome);
  }
  if (expected > 0.5) {
    return copy.againstWeaker(outcome);
  }
  return copy.againstEven(outcome);
}

function ratingNote(
  rating: NonNullable<
    NonNullable<PerformanceRatingResultData["result"]>["rating"]
  >,
  locale: Locale,
) {
  const copy = messagesFor(locale).rating.performance.result.rating;
  const how =
    rating.trimmed && rating.organizerCountedDouble
      ? copy.trimmedAndDouble
      : rating.trimmed
        ? copy.trimmed
        : rating.organizerCountedDouble
          ? copy.double
          : null;
  return [
    copy.from(rating.ballotsReceived),
    how,
    copy.average(formatPerformanceRating(rating.gameAverageHundredths)),
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

function noRatingDetail(
  noRating: NonNullable<PerformanceRatingResultData["result"]>["noRating"],
  locale: Locale,
) {
  const copy = messagesFor(locale).rating.performance.result.noRating;
  if (!noRating) {
    return copy.organizerDidNotRate;
  }
  if (noRating.reason === "organizer_rated") {
    return copy.organizerRated;
  }
  if (noRating.reason === "organizer_did_not_rate") {
    return copy.organizerDidNotRate;
  }
  return noRating.ballotsReceived === 0
    ? copy.nobody(MIN_BALLOTS)
    : copy.tooFew(noRating.ballotsReceived, MIN_BALLOTS);
}

/** Lowest first, as the fish track reads from Safi to the Shark. */
const TRACK_BANDS: readonly TierBand[] = ["safi", "kanaad", "hamour", "shark"];

function tierView(
  tier: NonNullable<PerformanceRatingResultData["result"]>["tier"],
  locale: Locale,
) {
  const m = messagesFor(locale).rating;
  const copy = m.performance.result.tier;
  if (tier.placeAfter == null) {
    return {
      title: copy.title,
      aside: m.tier.provisionalGames(tier.gamesOfFive, TIER_PROVISIONAL_GAMES),
      track: null,
      provisional: true,
      line: copy.provisional,
    };
  }
  const placeOf = m.adjust.placeOf(tier.placeAfter, tier.rankedCount ?? 0);
  const before = tier.placeBefore;
  const aside =
    before == null || before === tier.placeAfter
      ? placeOf
      : before > tier.placeAfter
        ? copy.upFrom(placeOf, before)
        : copy.downFrom(placeOf, before);
  const band = tier.bandAfter;
  if (!band) {
    return {
      title: copy.title,
      aside,
      track: null,
      provisional: false,
      line: copy.noFish,
    };
  }
  const label = m.bands[band];
  const from = tier.bandBefore;
  const moved =
    from === band
      ? copy.still(label)
      : from == null
        ? copy.nowA(label)
        : TRACK_BANDS.indexOf(band) > TRACK_BANDS.indexOf(from)
          ? copy.upTo(label)
          : copy.downTo(label);
  const next =
    tier.nextBand && tier.pointsToNextBand != null
      ? copy.toNext(
          formatTierPoints(tier.pointsToNextBand),
          tierPointsCount(tier.pointsToNextBand),
          m.bands[tier.nextBand],
        )
      : null;
  return {
    title: copy.title,
    aside,
    track: TRACK_BANDS.map((entry) => ({
      band: entry,
      label: m.bands[entry],
      current: entry === band,
    })),
    provisional: false,
    line: next ? `${moved} ${next}` : moved,
  };
}

function mvpView(
  mvp: NonNullable<PerformanceRatingResultData["result"]>["mvp"],
  locale: Locale,
) {
  if (!mvp) {
    return null;
  }
  const copy = messagesFor(locale).rating.performance.result.mvp;
  const how =
    mvp.decidedBy === "vote" && mvp.votes
      ? copy.votes(mvp.votes.for, mvp.votes.cast)
      : mvp.decidedBy === "tie_break"
        ? copy.tieBreak
        : copy.picked;
  const rating =
    mvp.ratingHundredths == null
      ? null
      : formatPerformanceRating(mvp.ratingHundredths);
  return {
    title: copy.title(mvp.isViewer ? copy.you : mvp.name),
    detail: rating ? copy.rated(how, rating) : how,
  };
}

/**
 * Screen 4c on Game details, or the line that says when it will arrive. While
 * the viewer may still rate, the Rate the game card says when it closes, so
 * the pending line is left out.
 */
export function performanceResultView(
  data: PerformanceRatingResultData,
  locale: Locale,
  options: { viewerMayRate?: boolean; now?: Date } = {},
): PerformanceResultView | null {
  const now = options.now ?? new Date();
  const m = messagesFor(locale).rating.performance;
  if (!data.played) {
    return null;
  }
  if (data.state === "suspended") {
    return { kind: "pending", ...m.suspended };
  }
  if (data.state === "open") {
    if (options.viewerMayRate) {
      return null;
    }
    const pending = m.result.pending;
    return {
      kind: "pending",
      title: pending.title,
      description:
        data.mode === "organizer"
          ? pending.organizer(formatRatingWindowClose(data.closesAt, locale))
          : data.countsForLevel
            ? pending.everyoneOvr(closesLine(data.closesAt, now, locale))
            : pending.everyone(closesLine(data.closesAt, now, locale)),
    };
  }
  const result = data.result;
  if (!result) {
    return null;
  }
  const copy = m.result;
  const names = {
    slot1: footballBibName(result.bibs.slot1, 1, locale),
    slot2: footballBibName(result.bibs.slot2, 2, locale),
  };
  const resultRow: PerformanceResultRow = {
    title: copy.points.result,
    detail: resultDetail(result, locale),
    delta: formatTierDelta(result.resultDelta),
    spoken: copy.points.spoken(
      copy.points.result,
      formatTierDelta(result.resultDelta),
      tierPointsCount(result.resultDelta),
    ),
  };
  const performanceRow: PerformanceResultRow = {
    title: copy.points.performance,
    detail: result.rating
      ? result.rating.usualHundredths == null
        ? copy.points.rated(formatPerformanceRating(result.rating.hundredths))
        : copy.points.againstUsual(
            formatPerformanceRating(result.rating.hundredths),
            formatPerformanceRating(result.rating.usualHundredths),
          )
      : noRatingDetail(result.noRating, locale),
    delta: formatTierDelta(result.performanceDelta),
    spoken: copy.points.spoken(
      copy.points.performance,
      formatTierDelta(result.performanceDelta),
      tierPointsCount(result.performanceDelta),
    ),
  };
  const totalTitle = copy.points.total(
    formatTierPoints(result.pointsBefore),
    formatTierPoints(result.pointsAfter),
  );
  return {
    kind: "settled",
    groupName: result.groupName,
    gameLine: result.windowStart
      ? copy.gameOn(
          formatGameDay(result.windowStart, locale, { weekday: "short" }),
        )
      : copy.game,
    scoreLine: result.score
      ? copy.score(
          names.slot1,
          m.hero.score(result.score.slot1, result.score.slot2),
          names.slot2,
        )
      : null,
    rating: result.rating
      ? {
          value: formatPerformanceRating(result.rating.hundredths),
          ofTen: copy.rating.ofTen,
          spoken: copy.rating.spoken(
            formatPerformanceRating(result.rating.hundredths),
          ),
          note: ratingNote(result.rating, locale),
        }
      : null,
    points: {
      title: copy.points.title,
      aside: result.groupName,
      rows: [resultRow, performanceRow],
      total: {
        title: totalTitle,
        detail: copy.points.weight(result.weightPercent),
        delta: formatTierDelta(result.delta),
        spoken: copy.points.spoken(
          totalTitle,
          formatTierDelta(result.delta),
          tierPointsCount(result.delta),
        ),
      },
    },
    tier: tierView(result.tier, locale),
    mvp: mvpView(result.mvp, locale),
    footnote: copy.footnote,
  };
}

/** A player row of what `games.performanceRatingSummary` returns; no ids, and never who gave what. */
export type PerformanceRatingSummaryPlayer = {
  name: string;
  isViewer: boolean;
  ratingHundredths: number | null;
  /** Ballots that counted for the player, before the highest and lowest went. */
  ballotsReceived: number;
  /** Null when the Match moved nobody's points. */
  delta: number | null;
  bandBefore: TierBand | null;
  bandAfter: TierBand | null;
  isMvp: boolean;
};

/**
 * What `games.performanceRatingSummary` returns to an Organizer of the Game
 * (screen 4d). `summary` is null until the window settles. It counts the
 * raters who counted for less and never says which.
 */
export type PerformanceRatingSummaryData = {
  state: "open" | "suspended" | "settled";
  mode: RatingWindowMode;
  closesAt: Date | string;
  summary: {
    groupId: string;
    groupName: string | null;
    closedAt: Date | string;
    score: { slot1: number; slot2: number } | null;
    bibs: { slot1: FootballBib; slot2: FootballBib };
    viewerSide: 1 | 2 | null;
    progress: { raters: number; players: number };
    slot1: PerformanceRatingSummaryPlayer[];
    slot2: PerformanceRatingSummaryPlayer[];
    ratersCountedForLess: number;
  } | null;
};

/** Rows a side other than the first shows before "N more". */
export const SUMMARY_PREVIEW_ROWS = 2;

export type RatingSummaryRow = {
  key: string;
  initials: string;
  /** The player's own name, where `name` says "You" for the viewer. */
  playerName: string;
  name: string;
  isViewer: boolean;
  detail: string;
  /** The MVP and a change of fish stand out. */
  detailStrong: boolean;
  rating: string;
  points: string | null;
  spoken: string;
};

export type RatingSummarySide = {
  slot: 1 | 2;
  bib: FootballBib;
  name: string;
  aside: string;
  rows: RatingSummaryRow[];
  /** How many rows show until "N more" is pressed; null shows them all. */
  previewCount: number | null;
  moreLabel: string | null;
};

export type PerformanceRatingSummaryView =
  | { kind: "pending"; title: string; description: string }
  | {
      kind: "settled";
      groupId: string;
      hero: RateGameView["hero"];
      sides: RatingSummarySide[];
      outliers: { title: string; description: string } | null;
      footer: { title: string; description: string; cta: string };
    };

function summaryDetail(player: PerformanceRatingSummaryPlayer, locale: Locale) {
  const m = messagesFor(locale).rating;
  const copy = m.performance.summary.row;
  if (player.isMvp) {
    return { text: copy.mvp, strong: true };
  }
  const { bandBefore, bandAfter } = player;
  if (bandAfter && bandBefore !== bandAfter) {
    const label = m.bands[bandAfter];
    const text = !bandBefore
      ? copy.nowA(label)
      : TRACK_BANDS.indexOf(bandAfter) > TRACK_BANDS.indexOf(bandBefore)
        ? copy.upTo(label)
        : copy.downTo(label);
    return { text, strong: true };
  }
  return {
    text:
      player.ballotsReceived > 0
        ? copy.ratings(player.ballotsReceived)
        : copy.notRated,
    strong: false,
  };
}

function byRatingThenName(
  left: PerformanceRatingSummaryPlayer,
  right: PerformanceRatingSummaryPlayer,
) {
  if (left.ratingHundredths !== right.ratingHundredths) {
    if (left.ratingHundredths === null) {
      return 1;
    }
    if (right.ratingHundredths === null) {
      return -1;
    }
    return right.ratingHundredths - left.ratingHundredths;
  }
  return left.name.localeCompare(right.name);
}

/**
 * Screen 4d, the Organizer's summary: each side's players by rating, with
 * their points move and any change of fish, how many rated, and a line when
 * raters counted for less, without saying who.
 */
export function performanceRatingSummaryView(
  data: PerformanceRatingSummaryData,
  locale: Locale,
  now: Date = new Date(),
): PerformanceRatingSummaryView {
  const messages = messagesFor(locale);
  const m = messages.rating.performance;
  const copy = m.summary;
  if (data.state === "suspended") {
    return { kind: "pending", ...m.suspended };
  }
  const summary = data.summary;
  if (data.state === "open" || !summary) {
    return {
      kind: "pending",
      title: copy.pending.title,
      description: copy.pending.description(
        data.mode === "organizer"
          ? formatRatingWindowClose(data.closesAt, locale)
          : closesLine(data.closesAt, now, locale),
      ),
    };
  }

  const names = {
    slot1: footballBibName(summary.bibs.slot1, 1, locale),
    slot2: footballBibName(summary.bibs.slot2, 2, locale),
  };
  const firstSlot: 1 | 2 = summary.viewerSide ?? 1;
  const rated =
    data.mode === "everyone"
      ? m.side.ratedOf(summary.progress.raters, summary.progress.players)
      : summary.progress.raters > 0
        ? copy.organizerRated
        : copy.organizerDidNotRate;

  const row = (
    player: PerformanceRatingSummaryPlayer,
    index: number,
    slot: 1 | 2,
  ): RatingSummaryRow => {
    const detail = summaryDetail(player, locale);
    const name = player.isViewer ? m.you : player.name;
    const rating =
      player.ratingHundredths === null
        ? null
        : formatPerformanceRating(player.ratingHundredths);
    const points = player.delta === null ? null : formatTierDelta(player.delta);
    return {
      key: `${slot}:${index}`,
      initials: initials(player.name),
      playerName: player.name,
      name,
      isViewer: player.isViewer,
      detail: detail.text,
      detailStrong: detail.strong,
      rating: rating ?? m.notRated,
      points,
      spoken: [
        name,
        detail.text,
        rating ? copy.row.ratedSpoken(rating) : copy.row.notRatedSpoken,
        points
          ? copy.row.pointsSpoken(points, tierPointsCount(player.delta ?? 0))
          : null,
      ]
        .filter((part): part is string => Boolean(part))
        .join(copy.row.spokenSeparator),
    };
  };

  const side = (slot: 1 | 2): RatingSummarySide => {
    const players = [...(slot === 1 ? summary.slot1 : summary.slot2)].sort(
      byRatingThenName,
    );
    const rows = players.map((player, index) => row(player, index, slot));
    const preview =
      slot !== firstSlot && rows.length > SUMMARY_PREVIEW_ROWS + 1
        ? SUMMARY_PREVIEW_ROWS
        : null;
    return {
      slot,
      bib: slot === 1 ? summary.bibs.slot1 : summary.bibs.slot2,
      name: slot === 1 ? names.slot1 : names.slot2,
      aside: copy.columns,
      rows,
      previewCount: preview,
      moreLabel: preview === null ? null : copy.more(rows.length - preview),
    };
  };

  return {
    kind: "settled",
    groupId: summary.groupId,
    hero: {
      sport: messages.common.football,
      groupName: summary.groupName,
      status: m.hero.final,
      slot1: { bib: summary.bibs.slot1, name: names.slot1 },
      slot2: { bib: summary.bibs.slot2, name: names.slot2 },
      score: summary.score
        ? m.hero.score(summary.score.slot1, summary.score.slot2)
        : null,
      line: copy.line(rated, formatRatingWindowClose(summary.closedAt, locale)),
    },
    sides: firstSlot === 1 ? [side(1), side(2)] : [side(2), side(1)],
    outliers:
      summary.ratersCountedForLess > 0
        ? {
            title: copy.outliers.title(summary.ratersCountedForLess),
            description: copy.outliers.description,
          }
        : null,
    footer: copy.footer,
  };
}

/** The card on a played Game that opens screen 4d for an Organizer, once the window has settled. */
export function ratingSummaryEntry(
  window: { state: RatingWindowState } | null,
  isOrganizer: boolean,
  locale: Locale,
) {
  if (!window || !isOrganizer || window.state !== "settled") {
    return null;
  }
  return messagesFor(locale).rating.performance.summary.entry;
}
