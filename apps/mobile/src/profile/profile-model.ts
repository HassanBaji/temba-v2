import {
  footballHeroLevelView,
  footballRoleView,
} from "@repo/domain/player-profile-football";
import { formatDayMonth, formatMonth } from "@repo/domain/format-game-start";
import {
  bandFromLevel,
  formatPadelLevel,
  matchesTowardConfirming,
  RATED_MATCHES_TO_CONFIRM,
  type LevelBand,
} from "@repo/domain/level";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import { homeAreaLabel } from "@repo/domain/profile-details";
import { zonedParts } from "@repo/domain/product-timezone";
import {
  resultMarkLabel,
  type MatchOutcome,
  type ResultMarkVariant,
} from "@repo/domain/result-mark";
import { SPORTS, type Sport } from "@repo/domain/sport";
import { WIN_RATE_MIN_MATCHES } from "@repo/domain/win-rate";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RouterOutputs } from "../trpc/react";

export type MyProfile = RouterOutputs["users"]["myProfile"];
export type FootballProfile = RouterOutputs["users"]["footballProfile"];

export const LAST_TEN = 10;
const EMPTY = "—";
const MINUS = "−";

function rounded(value: number) {
  return Math.round(value * 100) / 100;
}

/** "+0.12", "−0.12", "0.00": a typographic minus, so the column lines up. */
export function signedDelta(value: number): string {
  const amount = Math.abs(rounded(value)).toFixed(2);
  if (amount === "0.00") {
    return amount;
  }
  return `${value > 0 ? "+" : MINUS}${amount}`;
}

/** "+.04" under a Last 10 slot, where width is tight. */
export function compactDelta(value: number): string {
  return signedDelta(value).replace("0.", ".");
}

/** "▲ 0.12" for a hero line. */
export function arrowDelta(value: number): string {
  const amount = Math.abs(rounded(value)).toFixed(2);
  return `${value >= 0 ? "▲" : "▼"} ${amount}`;
}

export function displayBand(band: LevelBand): string {
  return displayLabelFromStoredBand(band);
}

export function monthYear(
  value: Date | string,
  locale: Locale,
  style: "short" | "long" = "short",
): string {
  return `${formatMonth(value, style, locale)} ${zonedParts(new Date(value)).year}`;
}

/** "Seef · Member since Mar 2026", or just the member line without an area. */
export function headerLine(
  details: { homeArea: string | null; createdAt: Date | string },
  locale: Locale,
): string {
  const m = messagesFor(locale).you.header;
  const since = m.memberSince(monthYear(details.createdAt, locale));
  return details.homeArea
    ? m.areaAndSince(homeAreaLabel(details.homeArea, locale), since)
    : since;
}

export function sportProfilePath(sport: Sport): string {
  return `/profile/${sport}`;
}

/** The sports set up first, then the ones the User can still add. */
export function sportChips(sports: readonly Sport[]) {
  return {
    setUp: SPORTS.filter((sport) => sports.includes(sport)),
    addable: SPORTS.filter((sport) => !sports.includes(sport)),
  };
}

export type HeroStat = { value: string; label: string };

export type HeroView =
  | {
      kind: "rated";
      label: string;
      status: string;
      band: string;
      rating: string;
      ring: { percent: number; label: string; provisional: boolean };
      movement: string | null;
      outlook: string;
      curve: { title: string; span: string | null; values: number[] };
      stats: HeroStat[];
      spoken: string;
    }
  | { kind: "none"; label: string; stats: HeroStat[] };

function heroStats(profile: MyProfile, locale: Locale): HeroStat[] {
  const m = messagesFor(locale).you.hero;
  const { stats } = profile;
  const winRate =
    stats.winRatePercent == null
      ? { value: EMPTY, label: m.winRateAfter(WIN_RATE_MIN_MATCHES) }
      : { value: `${stats.winRatePercent}%`, label: m.winRate };
  const matches = { value: String(stats.played), label: m.matches };
  const run = stats.run;
  return [
    winRate,
    matches,
    {
      value: run
        ? run.outcome === "won"
          ? m.streakWon(run.count)
          : m.streakLost(run.count)
        : EMPTY,
      label: m.streak,
    },
  ];
}

function curveSpan(
  history: readonly { at: Date | string | null }[],
  locale: Locale,
): string | null {
  const dated = history.flatMap((point) => (point.at ? [point.at] : []));
  const first = dated[0];
  const last = dated[dated.length - 1];
  if (!first || !last) {
    return null;
  }
  const from = formatMonth(first, "short", locale);
  const to = formatMonth(last, "short", locale);
  return from === to ? from : messagesFor(locale).you.hero.graphSpan(from, to);
}

/** The ink card: the Temba Level. */
export function heroView(profile: MyProfile, locale: Locale): HeroView {
  const m = messagesFor(locale).you.hero;
  const label = m.generalLevel;
  const stats = heroStats(profile, locale);
  const level = profile.level;
  if (!level) {
    return { kind: "none", label, stats };
  }

  const band = displayBand(level.levelBand);
  const rating = formatPadelLevel(level.rating, 2);
  const rated = profile.ratedMatchCount;
  const status = level.provisional
    ? m.provisionalRated(rated)
    : m.confirmed(rated);

  const toward = matchesTowardConfirming(level.ratedMatchesRemaining);
  const ring = level.provisional
    ? {
        percent: (toward / RATED_MATCHES_TO_CONFIRM) * 100,
        label: m.toConfirm(toward, RATED_MATCHES_TO_CONFIRM),
        provisional: true,
      }
    : {
        percent: level.progressPercent,
        label: m.percentThrough(level.progressPercent),
        provisional: false,
      };

  const movement =
    level.weekDelta == null ? null : m.thisWeek(arrowDelta(level.weekDelta));

  const nextBand = level.nextBand ? displayBand(level.nextBand) : null;
  const distance = level.distanceToNext?.toFixed(2) ?? null;
  let outlook: string;
  if (level.provisional) {
    outlook = m.settles(level.ratedMatchesRemaining);
  } else if (!nextBand || !distance) {
    outlook = m.topBand;
  } else {
    outlook = level.winsToNext
      ? `${m.toNext(distance, nextBand)} ${m.winsToNext(level.winsToNext)}`
      : m.toNext(distance, nextBand);
  }

  return {
    kind: "rated",
    label,
    status,
    band,
    rating,
    ring,
    movement,
    outlook,
    curve: {
      title: m.graphTitle(Math.max(0, level.history.length - 1)),
      span: curveSpan(level.history, locale),
      values: level.history.map((point) => point.level),
    },
    stats,
    spoken: m.spoken(band, rating, status),
  };
}

export type FormSlotView = {
  key: string;
  variant: ResultMarkVariant;
  delta: string | null;
  spoken: string;
};

/** Ten slots filled from the left, oldest first; the unplayed ones trail on the right. */
export function lastTenSlots(
  newestFirst: readonly {
    matchId: string;
    outcome: MatchOutcome;
    delta?: number | null;
  }[],
  locale: Locale,
): FormSlotView[] {
  const shown = newestFirst.slice(0, LAST_TEN).reverse();
  const padding = Array.from(
    { length: LAST_TEN - shown.length },
    (_, index): FormSlotView => ({
      key: `empty-${index}`,
      variant: "not-played",
      delta: null,
      spoken: resultMarkLabel("not-played", locale),
    }),
  );
  return [
    ...shown.map((match): FormSlotView => {
      const outcome = resultMarkLabel(match.outcome, locale);
      const delta = match.delta == null ? null : compactDelta(match.delta);
      return {
        key: match.matchId,
        variant: match.outcome,
        delta,
        spoken:
          match.delta == null
            ? outcome
            : messagesFor(locale).you.form.spoken(
                outcome,
                signedDelta(match.delta),
              ),
      };
    }),
    ...padding,
  ];
}

export function lastTenRecord(
  newestFirst: readonly { outcome: MatchOutcome }[],
  locale: Locale,
): string {
  const m = messagesFor(locale).you.form;
  const shown = newestFirst.slice(0, LAST_TEN);
  const won = shown.filter((match) => match.outcome === "won").length;
  const lost = shown.filter((match) => match.outcome === "lost").length;
  const drawn = shown.length - won - lost;
  return drawn > 0 ? m.recordWithDrawn(won, lost, drawn) : m.record(won, lost);
}

export function tilesView(stats: MyProfile["stats"], locale: Locale) {
  const m = messagesFor(locale).you.tiles;
  const totalSets = stats.sets.won + stats.sets.lost;
  return {
    sets: {
      value: stats.played > 0 ? `${stats.sets.won}–${stats.sets.lost}` : EMPTY,
      sub:
        totalSets > 0
          ? m.setsWon(Math.round((stats.sets.won / totalSets) * 100))
          : m.none,
    },
    streak: stats.longestStreak
      ? {
          value: m.wins(stats.longestStreak.count),
          sub: stats.longestStreak.reachedAt
            ? monthYear(stats.longestStreak.reachedAt, locale, "long")
            : "",
        }
      : { value: EMPTY, sub: m.none },
  };
}

export type PartnerRow = {
  userId: string;
  name: string;
  image: string | null;
  record: string;
  percent: number;
  spoken: string;
};

export function partnerRows(
  partners: MyProfile["partners"],
  sport: Sport,
  locale: Locale,
): PartnerRow[] {
  const m = messagesFor(locale).you.partners;
  return partners.map((partner) => {
    const drawn = partner.played - partner.won - partner.lost;
    const percent =
      partner.played > 0 ? Math.round((partner.won / partner.played) * 100) : 0;
    return {
      userId: partner.userId,
      name: partner.name,
      image: partner.image,
      record:
        sport === "football"
          ? `${partner.won}–${drawn}–${partner.lost}`
          : m.record(partner.won, partner.lost),
      percent,
      spoken: m.spoken(partner.name, partner.won, partner.lost, percent),
    };
  });
}

export type RecentRow = {
  matchId: string;
  gameId: string;
  outcome: MatchOutcome;
  title: string;
  sub: string;
  score: string;
  delta: string | null;
  canOpenGame: boolean;
};

export function recentRows(
  recent: MyProfile["recent"],
  locale: Locale,
): RecentRow[] {
  const all = messagesFor(locale);
  const m = all.you.recent;
  const names = all.mobileYou.names;
  return recent.map((match) => ({
    matchId: match.matchId,
    gameId: match.gameId,
    outcome: match.outcome,
    title:
      match.partners.length > 0
        ? m.withVs(names(match.partners), names(match.opponents))
        : m.vs(names(match.opponents)),
    sub: m.when(
      formatDayMonth(match.playedAt, locale, { weekday: "short" }),
      match.groupName ?? m.friendly,
    ),
    score: match.sets.map((set) => `${set.us}–${set.them}`).join("  "),
    delta: match.delta == null ? null : signedDelta(match.delta),
    canOpenGame: match.canOpenGame,
  }));
}

/** Polyline points for the rating curve, oldest to newest along x. */
export function curvePoints(
  values: readonly number[],
  width: number,
  height: number,
  options: { pad?: number; mirrored?: boolean } = {},
): { x: number; y: number }[] {
  if (values.length === 0) {
    return [];
  }
  const pad = options.pad ?? 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  return values.map((value, index) => {
    const along =
      values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const normalized = span === 0 ? 0.5 : (value - min) / span;
    return {
      x: options.mirrored ? width - along : along,
      y: pad + (1 - normalized) * (height - pad * 2),
    };
  });
}

/** Band letters for the curve's top, middle and bottom guides. */
export function curveGuideLabels(
  values: readonly number[],
): [string, string, string] {
  if (values.length === 0) {
    return ["", "", ""];
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  return [max, (max + min) / 2, min].map((value) =>
    displayBand(bandFromLevel(value)),
  ) as [string, string, string];
}

export function pathFor(points: readonly { x: number; y: number }[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
}

export function pathLength(points: readonly { x: number; y: number }[]) {
  let length = 0;
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    if (from && to) {
      length += Math.hypot(to.x - from.x, to.y - from.y);
    }
  }
  return length;
}

export function footballTabView(profile: FootballProfile, locale: Locale) {
  const all = messagesFor(locale);
  const m = all.you;
  const { overall, rating } = profile;
  const newestFirst = profile.lastMatches;
  const oldestFirst = [...newestFirst].reverse();
  const maxGoals = Math.max(1, ...oldestFirst.map((match) => match.goals));
  const goalsLastTen = newestFirst.reduce(
    (total, match) => total + match.goals,
    0,
  );
  const hero = rating ? footballHeroLevelView(rating, locale) : null;
  const percentOf = (count: number) =>
    overall.played > 0 ? (count / overall.played) * 100 : 0;

  return {
    level: hero
      ? { ...hero, status: hero.placement ? m.football.selfPlaced : null }
      : null,
    roleLine: footballRoleView(profile.role, locale).label,
    goals: {
      total: all.mobileYou.goalsInMatch(goalsLastTen),
      bars: [
        ...oldestFirst.map((match) => ({
          key: match.matchId,
          goals: match.goals,
          percent: (match.goals / maxGoals) * 100,
          spoken: all.mobileYou.goalsInMatch(match.goals),
        })),
        ...Array.from(
          { length: LAST_TEN - oldestFirst.length },
          (_, index) => ({
            key: `empty-${index}`,
            goals: null,
            percent: 0,
            spoken: resultMarkLabel("not-played", locale),
          }),
        ),
      ],
    },
    stats: [
      { value: String(overall.played), label: m.hero.matches },
      { value: String(overall.goals), label: all.mobileYou.goals },
      {
        value:
          overall.played > 0
            ? (overall.goals / overall.played).toFixed(2)
            : EMPTY,
        label: all.mobileYou.goalsAGame,
      },
    ],
    lastTen: lastTenSlots(newestFirst, locale),
    lastTenRecord: lastTenRecord(newestFirst, locale),
    allTime: {
      matches: m.football.matchesCount(overall.played),
      won: overall.won,
      drawn: overall.drawn,
      lost: overall.lost,
      wonPercent: percentOf(overall.won),
      drawnPercent: percentOf(overall.drawn),
      lostPercent: percentOf(overall.lost),
      bestRun:
        profile.streaks.best > 0
          ? m.football.bestRun(profile.streaks.best)
          : null,
      spoken: m.form.recordWithDrawn(overall.won, overall.lost, overall.drawn),
    },
  };
}
