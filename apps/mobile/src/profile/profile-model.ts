import { footballSelfPlacementChoices } from "@repo/domain/football-self-placement";
import { footballRoleView } from "@repo/domain/player-profile-football";
import { formatDayMonth, formatMonth } from "@repo/domain/format-game-start";
import { bandFromLevel, type LevelBand } from "@repo/domain/level";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import { homeAreaLabel } from "@repo/domain/profile-details";
import { zonedParts } from "@repo/domain/product-timezone";
import {
  resultMarkLabel,
  type MatchOutcome,
  type ResultMarkVariant,
} from "@repo/domain/result-mark";
import { SPORTS, type Sport } from "@repo/domain/sport";
import {
  shownWinRatePercent,
  WIN_RATE_MIN_MATCHES,
} from "@repo/domain/win-rate";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { initialsFor } from "../primitives/initials";
import type { RouterOutputs } from "../trpc/react";

export type MyProfile = RouterOutputs["users"]["myProfile"];
export type GroupLevel = RouterOutputs["ratings"]["myGroupLevels"][number];
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

function heroStats(
  profile: MyProfile,
  group: GroupLevel | null,
  locale: Locale,
): HeroStat[] {
  const m = messagesFor(locale).you.hero;
  const { stats } = profile;
  const winRate =
    stats.winRatePercent == null
      ? { value: EMPTY, label: m.winRateAfter(WIN_RATE_MIN_MATCHES) }
      : { value: `${stats.winRatePercent}%`, label: m.winRate };
  const matches = { value: String(stats.played), label: m.matches };
  if (profile.group) {
    return [
      winRate,
      matches,
      group
        ? { value: `#${group.rank}`, label: m.standing(group.rankedCount) }
        : { value: EMPTY, label: m.unranked },
    ];
  }
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

/** The ink card for the chosen scope: General or one Group. */
export function heroView(
  profile: MyProfile,
  group: GroupLevel | null,
  locale: Locale,
): HeroView {
  const m = messagesFor(locale).you.hero;
  const label = profile.group
    ? m.groupLevel(profile.group.name)
    : m.generalLevel;
  const stats = heroStats(profile, group, locale);
  const level = profile.level;
  if (!level) {
    return { kind: "none", label, stats };
  }

  const band = displayBand(level.levelBand);
  const rating = level.rating.toFixed(2);
  const rated = profile.ratedMatchCount;
  const setBy = profile.group ? (group?.setBy ?? null) : null;

  const status = setBy
    ? m.setByOrganizer
    : level.provisional
      ? m.provisionalRated(rated)
      : profile.group
        ? m.groupRated(rated)
        : m.confirmed(rated);

  const confirmTotal = rated + level.ratedMatchesRemaining;
  const ring = level.provisional
    ? {
        percent: confirmTotal > 0 ? (rated / confirmTotal) * 100 : 0,
        label: m.toConfirm(rated, confirmTotal),
        provisional: true,
      }
    : {
        percent: level.progressPercent,
        label: m.percentThrough(level.progressPercent),
        provisional: false,
      };

  const difference = profile.group
    ? (group?.differenceFromGeneral ?? null)
    : null;
  const movement = profile.group
    ? difference == null
      ? null
      : m.vsGeneral(arrowDelta(difference))
    : level.weekDelta == null
      ? null
      : m.thisWeek(arrowDelta(level.weekDelta));

  const nextBand = level.nextBand ? displayBand(level.nextBand) : null;
  const distance = level.distanceToNext?.toFixed(2) ?? null;
  let outlook: string;
  if (setBy) {
    outlook = m.setOn(setBy.name, formatDayMonth(setBy.at, locale));
  } else if (level.provisional) {
    outlook = profile.group
      ? m.groupSettles(level.ratedMatchesRemaining)
      : m.settles(level.ratedMatchesRemaining);
  } else if (!nextBand || !distance) {
    outlook = m.topBand;
  } else if (profile.group) {
    outlook = m.toNextInGroup(distance, nextBand);
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
      title: profile.group
        ? m.graphTitleGroup(profile.group.name)
        : m.graphTitle(Math.max(0, level.history.length - 1)),
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

export type GroupLevelRowView = {
  groupId: string;
  name: string;
  initials: string;
  provisional: boolean;
  sub: string;
  band: string;
  level: string;
  difference: { label: string; above: boolean } | null;
};

export function groupLevelRows(
  groups: readonly GroupLevel[],
  locale: Locale,
  levelLabel: (group: GroupLevel) => string = (group) =>
    group.rating.toFixed(2),
): GroupLevelRowView[] {
  const all = messagesFor(locale);
  const m = all.you.groups;
  return groups.map((group) => {
    const difference = group.differenceFromGeneral;
    return {
      groupId: group.groupId,
      name: group.name,
      initials: initialsFor(group.name),
      provisional: group.provisional && !group.setBy,
      sub: group.setBy
        ? m.setBy(group.setBy.name)
        : group.provisional
          ? m.provisionalLeft(group.ratedMatchesRemaining)
          : m.rankOf(group.rank, group.rankedCount, group.ratedMatchCount),
      band: displayBand(group.levelBand),
      level: levelLabel(group),
      difference:
        difference == null
          ? null
          : {
              label:
                rounded(difference) === 0
                  ? all.mobileYou.same
                  : signedDelta(difference),
              above: difference > 0,
            },
    };
  });
}

export type ScaleView = {
  ticks: { key: string; label: string; percent: number }[];
  markers: {
    key: string;
    tag: string;
    percent: number;
    general: boolean;
    spoken: string;
  }[];
};

const SCALE_MIN_SPAN = 0.5;

/** Where each Group Level sits against General on one line. */
export function groupScale(
  generalRating: number | null,
  groups: readonly GroupLevel[],
  locale: Locale,
): ScaleView | null {
  if (generalRating == null || groups.length === 0) {
    return null;
  }
  const all = messagesFor(locale);
  const points = [
    {
      key: "general",
      tag: all.you.groups.general,
      value: generalRating,
      general: true,
      name: all.you.scope.general,
    },
    ...groups.map((group) => ({
      key: group.groupId,
      tag: initialsFor(group.name),
      value: group.rating,
      general: false,
      name: group.name,
    })),
  ];
  const values = points.map((point) => point.value);
  let low = Math.floor((Math.min(...values) - 0.05) * 10) / 10;
  let high = Math.ceil((Math.max(...values) + 0.05) * 10) / 10;
  if (high - low < SCALE_MIN_SPAN) {
    const grow = (SCALE_MIN_SPAN - (high - low)) / 2;
    low -= grow;
    high += grow;
  }
  const span = high - low;
  const percentOf = (value: number) =>
    Math.max(0, Math.min(100, ((value - low) / span) * 100));
  const middle = low + span / 2;
  return {
    ticks: [low, middle, high].map((value, index) => ({
      key: `tick-${index}`,
      label: displayBand(bandFromLevel(value)),
      percent: percentOf(value),
    })),
    markers: points.map((point) => ({
      key: point.key,
      tag: point.tag,
      percent: percentOf(point.value),
      general: point.general,
      spoken: all.mobileYou.scaleSpoken(
        point.name,
        displayBand(bandFromLevel(point.value)),
        point.value.toFixed(2),
      ),
    })),
  };
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

/**
 * Football reads as the self-placement word ("Competitive") while the Level
 * still sits on a placement band, and as the band letter once it has moved.
 */
export function footballLevelWord(band: LevelBand, locale: Locale): string {
  const display = displayBand(band);
  return (
    footballSelfPlacementChoices(locale).find(
      (choice) => choice.band === display,
    )?.label ?? display
  );
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
  const selfPlaced =
    rating?.ratedMatchCount === 0 &&
    footballLevelWord(rating.levelBand, locale) !==
      displayBand(rating.levelBand);
  const winRatePercent = shownWinRatePercent(overall.won, overall.played);
  const percentOf = (count: number) =>
    overall.played > 0 ? (count / overall.played) * 100 : 0;

  return {
    level: rating
      ? {
          word: footballLevelWord(rating.levelBand, locale),
          band: displayBand(rating.levelBand),
          level: rating.level,
          status: selfPlaced ? m.football.selfPlaced : null,
        }
      : null,
    roleLine: footballRoleView(profile.role, locale).label,
    winRate:
      winRatePercent == null
        ? {
            percent: null,
            value: EMPTY,
            label: m.hero.winRateAfter(WIN_RATE_MIN_MATCHES),
          }
        : {
            percent: winRatePercent,
            value: `${winRatePercent}%`,
            label: m.hero.winRate,
          },
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
