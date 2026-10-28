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
import { productDaysBetween, zonedParts } from "@repo/domain/product-timezone";
import { sportOrDefault, type Sport } from "@repo/domain/sport";

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

/** "Tonight", "Today", "Tomorrow" or "Tue 20 Oct". */
export function upNextHeroDay(startsAt: Date, now: Date): string {
  const days = productDaysBetween(now, startsAt);
  if (days === 0) {
    return zonedParts(startsAt).hour >= EVENING_HOUR ? "Tonight" : "Today";
  }
  if (days === 1) {
    return "Tomorrow";
  }
  return formatDayMonth(startsAt, { weekday: "short" });
}

/** "in 2 h 15 min" inside the coming day, "on now" while it runs. */
export function startsInLabel(
  startsAt: Date,
  endsAt: Date,
  now: Date,
): string | null {
  if (startsAt.getTime() <= now.getTime()) {
    return endsAt.getTime() > now.getTime() ? "on now" : null;
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
    return `in ${minutes} min`;
  }
  return minutes === 0 ? `in ${hours} h` : `in ${hours} h ${minutes} min`;
}

export function minutesBetween(startsAt: Date, endsAt: Date): number {
  return Math.round((endsAt.getTime() - startsAt.getTime()) / MS_PER_MINUTE);
}

function gamePlace(game: UpNextGame): string | null {
  const side = game.football?.sideSize
    ? sideSizeLabel(game.football.sideSize)
    : null;
  return [game.venue?.name, game.courtName ?? side].filter(Boolean).join(", ");
}

export function upNextRowView(item: UpNextItem, now: Date): UpNextRowView {
  const { game } = item;
  const shared = {
    key: item.key,
    day: upNextDayLabel(item.startsAt, now),
    time: formatGameClock(item.startsAt),
    sport: item.sport,
  };
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
