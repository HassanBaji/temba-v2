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

import { minutesBetween } from "../booking/booking-model";
import { rowBadge } from "../booking/my-bookings-model";
import type { RouterOutputs } from "../trpc/react";

export type UpNextGame =
  RouterOutputs["users"]["home"]["carouselGames"][number];
export type UpNextBooking =
  RouterOutputs["bookings"]["listMine"]["items"][number];

export type UpNextItem =
  | {
      kind: "booking";
      key: string;
      startsAt: Date;
      sport: Sport;
      booking: UpNextBooking;
    }
  | {
      kind: "game";
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

/**
 * Bookings and Games in one list, soonest first. A Booking that already has
 * its Game shows as that Game, so the slot is listed once.
 */
export function upNextItems(
  games: readonly UpNextGame[],
  bookings: readonly UpNextBooking[],
): UpNextItem[] {
  const gameIds = new Set(games.map((game) => game.id));
  const items: UpNextItem[] = [
    ...games.map(
      (game): UpNextItem => ({
        kind: "game",
        key: `game:${game.matchId ?? game.id}`,
        startsAt: new Date(game.startTime),
        sport: sportOrDefault(game.sport),
        game,
      }),
    ),
    ...bookings
      .filter((booking) => !booking.gameId || !gameIds.has(booking.gameId))
      .map(
        (booking): UpNextItem => ({
          kind: "booking",
          key: `booking:${booking.id}`,
          startsAt: new Date(booking.startsAt),
          sport: sportOrDefault(booking.court.sport),
          booking,
        }),
      ),
  ];
  return items.sort(
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
  const m = messagesFor(locale).mobileHome.upNext;
  const count = items.filter(
    (item) => productDaysBetween(now, gameDayStart(item.startsAt)) < WEEK_DAYS,
  ).length;
  return count === 0 ? m.nothingThisWeek : m.thisWeek(count);
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

function gameRow(
  item: Extract<UpNextItem, { kind: "game" }>,
  shared: Pick<UpNextRowView, "key" | "day" | "time" | "sport">,
  locale: Locale,
): UpNextRowView {
  const { game } = item;
  const [row] = homeComingUpRows([game], locale);

  if (row?.kind === "tournament_match") {
    return {
      ...shared,
      title: row.title,
      detail: row.opponentLine,
      trailing: row.roundTag ? { kind: "tag", label: row.roundTag } : null,
      spoken: spokenParts(
        [row.title, shared.day, shared.time, row.opponentLine],
        locale,
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
      spoken: spokenParts(
        [row.title, shared.day, shared.time, row.teamsLine],
        locale,
      ),
    };
  }

  const { title, detail } = homeGameRowLines(game, locale);
  const allowed = gameCardRosterOccupancy(game) ? game.playersAllowed : null;
  const roster =
    allowed != null
      ? homeOpenSpotsLabel(game.registeredUserCount, allowed, locale)
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
    spoken: spokenParts(
      [title, shared.day, shared.time, detail, occupancy],
      locale,
    ),
  };
}

function spokenParts(
  parts: readonly (string | null | undefined)[],
  locale: Locale,
): string {
  return messagesFor(locale).mobileHome.join.parts(
    parts.filter((part): part is string => Boolean(part)),
  );
}

export function upNextRowView(
  item: UpNextItem,
  now: Date,
  locale: Locale,
): UpNextRowView {
  const shared = {
    key: item.key,
    day: upNextDayLabel(item.startsAt, now, locale),
    time: formatGameClock(item.startsAt, locale),
    sport: item.sport,
  };
  if (item.kind === "game") {
    return gameRow(item, shared, locale);
  }

  const { booking } = item;
  const startsAt = new Date(booking.startsAt);
  const endsAt = new Date(booking.endsAt);
  const detail = messagesFor(locale).mobileHome.upNext.bookingDetail(
    booking.court.name,
    minutesBetween(startsAt, endsAt),
  );
  const badge = rowBadge({ ...booking, startsAt, endsAt }, now, locale);
  return {
    ...shared,
    title: booking.venue.name,
    detail,
    trailing: { kind: "text", label: badge },
    spoken: spokenParts(
      [booking.venue.name, shared.day, shared.time, detail, badge],
      locale,
    ),
  };
}
