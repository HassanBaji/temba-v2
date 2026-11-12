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
import { initials } from "./initials";

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

/**
 * Each rated player's settled rating: the weighted mean of their ballots,
 * dropping the highest and the lowest from five ballots up. A player with
 * fewer ballots than the mode needs has no settled rating. A ballot to
 * oneself never counts; a rater missing from `raterWeights` weighs 1.
 */
export function settlePerformanceRatings(
  ballots: readonly PerformanceBallot[],
  raterWeights: ReadonlyMap<string, number> = new Map(),
  options: { mode: RatingWindowMode } = { mode: "everyone" },
): SettledPerformanceRating[] {
  const byRatee = new Map<string, PerformanceBallot[]>();
  for (const ballot of ballots) {
    if (
      ballot.raterUserId === ballot.rateeUserId ||
      !isPerformanceRatingValue(ballot.value) ||
      (raterWeights.get(ballot.raterUserId) ?? 1) <= 0
    ) {
      continue;
    }
    const list = byRatee.get(ballot.rateeUserId) ?? [];
    list.push(ballot);
    byRatee.set(ballot.rateeUserId, list);
  }

  const settled: SettledPerformanceRating[] = [];
  for (const [userId, list] of byRatee) {
    if (list.length < minBallotsFor(options.mode)) {
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
  result: string | null;
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
  heading: string;
  headingAside: string;
  sides: RateGameSide[];
  footnote: string;
  footer: { title: string; subline: string | null; submit: string };
  notice: { title: string; description: string } | null;
  canSubmit: boolean;
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
  const who = sheet.viewerIsOrganizer
    ? m.youOrganized
    : bibName
      ? m.youPlayedIn(bibName)
      : null;
  if (!place) {
    return who;
  }
  return who ? m.line(place, who) : place;
}

export function rateGameView(
  sheet: RateGameSheet,
  draft: RateGameDraft,
  locale: Locale,
): RateGameView {
  const messages = messagesFor(locale);
  const m = messages.rating.performance;
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
    return {
      slot,
      bib: slot === 1 ? sheet.bibs.slot1 : sheet.bibs.slot2,
      name,
      result: sideResult(sheet.score, slot, locale),
      ratedLine: m.side.ratedOf(rated, rateable.length),
      collapsedLine:
        rated === 0
          ? m.side.notRatedYet(rateable.length)
          : m.side.ratedOf(rated, rateable.length),
      showLabel: m.side.show(name),
      hideLabel: m.side.hide(name),
      openByDefault: slot === firstSlot,
      rows: rateable.map(row),
      self: viewer
        ? {
            initials: initials(viewer.name),
            name: m.you,
            playerName: viewer.name,
            note: m.selfNote,
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
    heading: m.heading,
    headingAside: sides[0]!.ratedLine,
    sides,
    footnote: sheet.mvp.pickable
      ? `${m.footnote(sheet.weightPercent)} ${m.footnoteStar}`
      : m.footnote(sheet.weightPercent),
    footer: {
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
  };
}

/** `Fri 8:30 PM`, on the product clock. */
export function formatRatingWindowClose(
  closesAt: Date | string,
  locale: Locale,
) {
  return `${formatWeekday(closesAt, "short", locale)} ${formatGameClock(closesAt, locale)}`;
}

/** The card on a played Game that opens screen 4a, while the viewer may rate. */
export function rateGameEntry(
  window: {
    mode: RatingWindowMode;
    state: RatingWindowState;
    closesAt: Date | string;
    viewerMayRate: boolean;
  } | null,
  locale: Locale,
) {
  if (
    !window ||
    !window.viewerMayRate ||
    window.state !== "open" ||
    window.mode !== "organizer"
  ) {
    return null;
  }
  const m = messagesFor(locale).rating.performance.entry;
  return {
    title: m.title,
    description: m.organizer(formatRatingWindowClose(window.closesAt, locale)),
    cta: m.cta,
  };
}
