import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatGameClock, formatWeekday } from "./format-game-start";
import { gameDayStart } from "./game-day";
import { homeGameRowLines } from "./home-game-lines";
import type { HubGameRow } from "./hub-game-row";
import { productDaysBetween } from "./product-timezone";
import { sportOrDefault, type Sport } from "./sport";

const WEEK_DAYS = 7;

/** "Today", else the weekday: every open-week row starts inside the coming week. */
function openWeekDay(startsAt: Date, now: Date, locale: Locale): string {
  const day = gameDayStart(startsAt);
  return productDaysBetween(now, day) <= 0
    ? messagesFor(locale).common.today
    : formatWeekday(day, "short", locale);
}

export type OpenWeekGame = HubGameRow;

export type OpenWeekRow = {
  key: string;
  gameId: string;
  day: string;
  time: string;
  title: string;
  detail: string | null;
  sport: Sport;
};

const OPEN_WEEK_ROWS = 2;

/** Games this week in the User's Groups that still have a seat to take. */
export function openWeekRows(
  games: readonly OpenWeekGame[],
  now: Date,
  locale: Locale,
): OpenWeekRow[] {
  const m = messagesFor(locale).home;
  return games
    .filter((game) => {
      const startsAt = new Date(game.startTime);
      return (
        game.canRegister &&
        !game.isRegistered &&
        startsAt.getTime() > now.getTime() &&
        productDaysBetween(now, gameDayStart(startsAt)) < WEEK_DAYS
      );
    })
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    )
    .slice(0, OPEN_WEEK_ROWS)
    .map((game) => {
      const startsAt = new Date(game.startTime);
      const { title } = homeGameRowLines(game, locale);
      const seats =
        game.playersAllowed != null
          ? m.upNextCard.whoIn(game.registeredUserCount, game.playersAllowed)
          : null;
      const place = game.venue?.name ?? null;
      return {
        key: game.id,
        gameId: game.id,
        day: openWeekDay(startsAt, now, locale),
        time: formatGameClock(startsAt, locale),
        title,
        detail:
          place && seats
            ? m.upNextCard.openRowDetail(place, seats)
            : (place ?? seats),
        sport: sportOrDefault(game.sport),
      };
    });
}
