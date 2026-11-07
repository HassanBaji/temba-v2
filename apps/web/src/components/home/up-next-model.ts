import {
  formatDayMonth,
  formatGameClock,
  formatWeekday,
} from "@repo/domain/format-game-start";
import { gameCardRosterOccupancy } from "@repo/domain/game-card";
import {
  homeComingUpRows,
  homeComingUpSeatBars,
} from "@repo/domain/home-coming-up";
import {
  homeGameRowLines,
  homeOpenSpotsLabel,
} from "@repo/domain/home-game-lines";
import { gameDayMinutes, gameDayStart } from "@repo/domain/game-day";
import { productDaysBetween } from "@repo/domain/product-timezone";
import { sportOrDefault, type Sport } from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RouterOutputs } from "~/trpc/react";

export type UpNextGame =
  RouterOutputs["users"]["home"]["carouselGames"][number];

export type UpNextItem = {
  key: string;
  startsAt: Date;
  sport: Sport;
  game: UpNextGame;
};

export type UpNextTrailing =
  | { kind: "bars"; bars: readonly ("taken" | "open")[] }
  | { kind: "text"; label: string }
  | { kind: "tag"; label: string };

export type UpNextRowView = {
  key: string;
  day: string;
  time: string;
  title: string;
  detail: string | null;
  sport: Sport;
  trailing: UpNextTrailing | null;
  spoken: string;
};

const WEEK_DAYS = 7;
const EVENING_HOUR = 17;
const MS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 24 * 60;

/** Games across both sports, soonest first. */
export function upNextItems(games: readonly UpNextGame[]): UpNextItem[] {
  return games
    .map(
      (game): UpNextItem => ({
        key: `game:${game.matchId ?? game.id}`,
        startsAt: new Date(game.startTime),
        sport: sportOrDefault(game.sport),
        game,
      }),
    )
    .sort(
      (a, b) =>
        a.startsAt.getTime() - b.startsAt.getTime() ||
        (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
    );
}

export function upNextWeekLabel(
  items: readonly UpNextItem[],
  now: Date,
  locale: Locale,
): string {
  const m = messagesFor(locale).webAuth.home;
  const count = items.filter(
    (item) => productDaysBetween(now, gameDayStart(item.startsAt)) < WEEK_DAYS,
  ).length;
  return count === 0 ? m.nothingThisWeek : m.thisWeekCount(count);
}

/** "Today", a weekday inside the coming week, then a date. */
export function upNextDayLabel(
  startsAt: Date,
  now: Date,
  locale: Locale,
): string {
  const day = gameDayStart(startsAt);
  const days = productDaysBetween(now, day);
  if (days <= 0) {
    return messagesFor(locale).common.today;
  }
  if (days < WEEK_DAYS) {
    return formatWeekday(day, "short", locale);
  }
  return formatDayMonth(day, locale);
}

/** "Tonight", "Today", "Tomorrow" or "Tue 20 Oct". */
export function upNextHeroDay(
  startsAt: Date,
  now: Date,
  locale: Locale,
): string {
  const m = messagesFor(locale);
  const day = gameDayStart(startsAt);
  const days = productDaysBetween(now, day);
  if (days === 0) {
    return gameDayMinutes(startsAt) >= EVENING_HOUR * 60
      ? m.dates.tonight
      : m.common.today;
  }
  if (days === 1) {
    return m.common.tomorrow;
  }
  return formatDayMonth(day, locale, { weekday: "short" });
}

/** "in 2 h 15 min" inside the coming day, "on now" while it runs. */
export function startsInLabel(
  startsAt: Date,
  endsAt: Date,
  now: Date,
  locale: Locale,
): string | null {
  const m = messagesFor(locale).webAuth.home;
  if (startsAt.getTime() <= now.getTime()) {
    return endsAt.getTime() > now.getTime() ? m.onNow : null;
  }
  const total = Math.max(
    1,
    Math.floor((startsAt.getTime() - now.getTime()) / MS_PER_MINUTE),
  );
  if (total >= MINUTES_PER_DAY) {
    return null;
  }
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) {
    return m.inMinutes(minutes);
  }
  return minutes === 0 ? m.inHours(hours) : m.inHoursMinutes(hours, minutes);
}

export function upNextRowView(
  item: UpNextItem,
  now: Date,
  locale: Locale,
): UpNextRowView {
  const { game } = item;
  const join = messagesFor(locale).home.comingUp.parts;
  const shared = {
    key: item.key,
    day: upNextDayLabel(item.startsAt, now, locale),
    time: formatGameClock(item.startsAt, locale),
    sport: item.sport,
  };
  const [row] = homeComingUpRows([game], locale);

  if (row?.kind === "tournament_match") {
    return {
      ...shared,
      title: row.title,
      detail: row.opponentLine,
      trailing: row.roundTag ? { kind: "tag", label: row.roundTag } : null,
      spoken: join(
        [row.title, shared.day, shared.time, row.opponentLine].filter(
          (part): part is string => Boolean(part),
        ),
      ),
    };
  }
  if (row?.kind === "tournament") {
    return {
      ...shared,
      title: row.title,
      detail: row.teamsLine,
      trailing: row.actionLabel
        ? { kind: "tag", label: row.actionLabel }
        : null,
      spoken: join(
        [row.title, shared.day, shared.time, row.teamsLine].filter(
          (part): part is string => Boolean(part),
        ),
      ),
    };
  }

  const { title, detail } = homeGameRowLines(game, locale);
  const roster = gameCardRosterOccupancy(game)
    ? homeOpenSpotsLabel(
        game.registeredUserCount,
        game.playersAllowed ?? 0,
        locale,
      )
    : null;
  const seats = row?.kind === "game" ? homeComingUpSeatBars(row, locale) : null;
  const trailing: UpNextTrailing | null = roster
    ? { kind: "text", label: roster }
    : seats && seats.bars.length > 0
      ? { kind: "bars", bars: seats.bars }
      : null;
  const occupancy = roster ?? seats?.spokenLabel ?? null;

  return {
    ...shared,
    title,
    detail,
    trailing,
    spoken: join(
      [title, shared.day, shared.time, detail, occupancy].filter(
        (part): part is string => Boolean(part),
      ),
    ),
  };
}
