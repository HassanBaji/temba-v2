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
import { gameDayStart } from "@repo/domain/game-day";
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

/** Games across both sports, soonest first. */
export function upNextItems(games: readonly UpNextGame[]): UpNextItem[] {
  return games
    .map(
      (game): UpNextItem => ({
        key: `game:${game.id}`,
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
  const m = messagesFor(locale).home.upNextCard;
  const count = items.filter(
    (item) => productDaysBetween(now, gameDayStart(item.startsAt)) < WEEK_DAYS,
  ).length;
  return count === 0 ? m.nothingThisWeek : m.oneOfThisWeek(count);
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
