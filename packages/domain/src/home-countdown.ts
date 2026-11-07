import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  formatGameClock,
  formatGameDay,
  gameDayProximity,
} from "./format-game-start";

const MINUTE_MS = 60_000;

/**
 * Live countdown for an upcoming Home game. Returns null when the start is
 * not in the future so the UI never shows a negative or zero-minute value.
 */
export function formatHomeCountdown(
  startsAt: Date,
  now: Date,
  locale: Locale,
): string | null {
  const m = messagesFor(locale).dates.countdown;
  const remainingMs = startsAt.getTime() - now.getTime();
  if (remainingMs <= 0) {
    return null;
  }

  const totalMinutes = Math.floor(remainingMs / MINUTE_MS);
  const dayMinutes = 24 * 60;
  if (totalMinutes >= dayMinutes) {
    return m.inDays(Math.floor(totalMinutes / dayMinutes));
  }
  if (totalMinutes < 60) {
    return m.inMinutes(Math.max(1, totalMinutes));
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return m.inHoursMinutes(hours, minutes);
}

/**
 * The Game-details hero's status pill: a countdown before kick-off, "Live
 * now" through the window, then a prompt for the score once it has ended.
 * Reads the clock rather than the server phase so a screen left open moves
 * on by itself.
 */
export function formatHeroCountdown(
  startsAt: Date,
  endsAt: Date | null,
  now: Date,
  locale: Locale,
): string {
  const m = messagesFor(locale).dates.countdown;
  const countdown = formatHomeCountdown(startsAt, now, locale);
  if (countdown) {
    return m.startsIn(countdown);
  }
  if (endsAt && endsAt.getTime() <= now.getTime()) {
    return m.endedEnterScore;
  }
  return m.liveNow;
}

/**
 * Composite "PM until 10:30" trailing string for the Game-details hero's
 * 54px time treatment (game-details redesign, TEM-179): the kickoff's own
 * meridiem plus an explicit end-time trailer. This composite does not
 * replace `formatHomeKickoff` — Home's own hero (`home-next-game.tsx`)
 * keeps using that as-is.
 */
export function formatHeroKickoffTrailer(
  startsAt: Date,
  windowEnd: Date | string | null | undefined,
  locale: Locale,
): string {
  const m = messagesFor(locale).dates.countdown;
  const kickoff = formatHomeKickoff(startsAt, locale);
  if (!windowEnd) {
    return kickoff.meridiem;
  }
  const end = splitClock(formatGameClock(windowEnd, locale));
  return kickoff.meridiem
    ? m.meridiemUntil(kickoff.meridiem, end)
    : m.until(end.clock);
}

function splitClock(clock: string) {
  const parts = clock.trim().split(/\s+/);
  return parts.length > 1
    ? { clock: parts.slice(0, -1).join(" "), meridiem: parts.at(-1) ?? "" }
    : { clock, meridiem: "" };
}

export function formatHomeKickoff(
  startsAt: Date,
  locale: Locale,
): {
  time: string;
  meridiem: string;
  relativeDay: string;
} {
  const m = messagesFor(locale).dates;
  const { clock: time, meridiem } = splitClock(
    formatGameClock(startsAt, locale),
  );
  const proximity = gameDayProximity(startsAt);
  const relativeDay =
    proximity === "today"
      ? m.tonightInSentence
      : proximity === "tomorrow"
        ? m.tomorrowInSentence
        : formatGameDay(startsAt, locale, { weekday: "short" });

  return { time, meridiem, relativeDay };
}
