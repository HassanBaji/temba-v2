import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatAbsoluteDay, formatGameClock } from "./format-game-start";
import { gameCustomName } from "./game-custom-name";
import { sideSizeLabel } from "./game-shape";
import { sportLabel } from "./sport";

export type HomeGameLinesInput = {
  name: string | null;
  hasCustomName?: boolean | null;
  format: string;
  startTime: Date | string;
  groupName?: string | null;
  venue: { name: string } | null;
  courtName: string | null;
  football?: { sideSize: number | null } | null;
};

const MS_PER_MINUTE = 60_000;

/** The hero chip after the sport: "Friendly" for a friendly Game. */
export function homeGameKind(format: string, locale: Locale): string {
  const m = messagesFor(locale).home.comingUp;
  return format === "friendly_game" ? m.friendly : m.gameFallback;
}

/**
 * The hero headline. A Game without a custom name stores its window label,
 * which repeats the big kickoff time, so the hero shows the date instead.
 */
export function homeHeroTitle(
  game: HomeGameLinesInput,
  locale: Locale,
): string {
  return gameCustomName(game) ?? formatAbsoluteDay(game.startTime, locale);
}

/** "until 12:00 PM, 90 min" beside the hero kickoff. */
export function homeHeroUntil(
  startsAt: Date,
  endsAt: Date,
  locale: Locale,
): string {
  return messagesFor(locale).home.comingUp.untilFor(
    formatGameClock(endsAt, locale),
    Math.round((endsAt.getTime() - startsAt.getTime()) / MS_PER_MINUTE),
  );
}

/**
 * A coming-up row: the custom name or the venue, then one short line. The
 * day column already shows the time, so the window label is never repeated.
 */
export function homeGameRowLines(
  game: HomeGameLinesInput,
  locale: Locale,
): { title: string; detail: string | null } {
  const m = messagesFor(locale).home.comingUp;
  const customName = gameCustomName(game);
  const sideSize = game.football?.sideSize;
  const title =
    customName ?? game.venue?.name ?? game.groupName ?? m.gameFallback;
  const parts = [
    customName ? game.venue?.name : null,
    game.courtName,
    sideSize ? sportLabel("football", locale) : null,
    sideSize ? sideSizeLabel(sideSize, locale) : null,
  ].filter((part): part is string => Boolean(part));
  return { title, detail: parts.length > 0 ? m.parts(parts) : null };
}

/** What the Organizer still needs: "10 open spots", or "Full". */
export function homeOpenSpotsLabel(
  registered: number,
  allowed: number,
  locale: Locale,
): string {
  const m = messagesFor(locale).home.seats;
  const open = Math.max(0, allowed - registered);
  return open === 0 ? m.full : m.spotsOpen(open);
}
