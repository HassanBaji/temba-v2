import {
  formatDayMonth,
  formatGameClock,
  formatWeekday,
} from "@repo/domain/format-game-start";
import { gameCardRosterOccupancy } from "@repo/domain/game-card";
import { sideSizeLabel } from "@repo/domain/game-shape";
import {
  homeComingUpRows,
  homeComingUpSeatBars,
} from "@repo/domain/home-coming-up";
import { productDaysBetween } from "@repo/domain/product-timezone";
import { sportOrDefault, type Sport } from "@repo/domain/sport";

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
): string {
  const count = items.filter(
    (item) => productDaysBetween(now, item.startsAt) < WEEK_DAYS,
  ).length;
  return count === 0 ? "Nothing this week" : `${count} this week`;
}

/** "Today", a weekday inside the coming week, then a date. */
export function upNextDayLabel(startsAt: Date, now: Date): string {
  const days = productDaysBetween(now, startsAt);
  if (days <= 0) {
    return "Today";
  }
  if (days < WEEK_DAYS) {
    return formatWeekday(startsAt, "short");
  }
  return formatDayMonth(startsAt);
}

function gamePlace(game: UpNextGame): string | null {
  const side = game.football?.sideSize
    ? sideSizeLabel(game.football.sideSize)
    : null;
  return [game.venue?.name, game.courtName ?? side].filter(Boolean).join(", ");
}

function gameRow(
  item: Extract<UpNextItem, { kind: "game" }>,
  shared: Pick<UpNextRowView, "key" | "day" | "time" | "sport">,
): UpNextRowView {
  const { game } = item;
  const [row] = homeComingUpRows([game]);

  if (row?.kind === "tournament_match") {
    return {
      ...shared,
      title: row.title,
      detail: row.opponentLine,
      trailing: row.roundTag ? { kind: "tag", label: row.roundTag } : null,
      spoken: [row.title, shared.day, shared.time, row.opponentLine]
        .filter(Boolean)
        .join(", "),
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
      spoken: [row.title, shared.day, shared.time, row.teamsLine]
        .filter(Boolean)
        .join(", "),
    };
  }

  const place = gamePlace(game);
  const title = game.name ?? game.groupName ?? game.venue?.name ?? "Game";
  const detail = place && place !== title ? place : null;
  const roster = gameCardRosterOccupancy(game)
    ? `${game.registeredUserCount} of ${game.playersAllowed}`
    : null;
  const seats = row?.kind === "game" ? homeComingUpSeatBars(row) : null;
  const trailing: UpNextTrailing | null = roster
    ? { kind: "text", label: roster }
    : seats && seats.bars.length > 0
      ? { kind: "bars", bars: seats.bars }
      : null;
  const occupancy = roster ? `${roster} players` : (seats?.spokenLabel ?? null);

  return {
    ...shared,
    title,
    detail,
    trailing,
    spoken: [title, shared.day, shared.time, detail, occupancy]
      .filter(Boolean)
      .join(", "),
  };
}

export function upNextRowView(item: UpNextItem, now: Date): UpNextRowView {
  const shared = {
    key: item.key,
    day: upNextDayLabel(item.startsAt, now),
    time: formatGameClock(item.startsAt),
    sport: item.sport,
  };
  if (item.kind === "game") {
    return gameRow(item, shared);
  }

  const { booking } = item;
  const startsAt = new Date(booking.startsAt);
  const endsAt = new Date(booking.endsAt);
  const detail = `${booking.court.name}, ${minutesBetween(startsAt, endsAt)} min`;
  const badge = rowBadge({ ...booking, startsAt, endsAt }, now);
  return {
    ...shared,
    title: booking.venue.name,
    detail,
    trailing: { kind: "text", label: badge },
    spoken: [booking.venue.name, shared.day, shared.time, detail, badge].join(
      ", ",
    ),
  };
}
