import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  formatDayMonth,
  formatGameClock,
  formatGameClockWithoutMeridiem,
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
 * Live countdown for the Game-details hero's Upcoming/Ongoing treatment
 * (game-details redesign, TEM-179). `formatHomeCountdown` returns `null`
 * once `startsAt` is no longer in the future, which is correct for Home
 * (an ongoing Game simply drops the countdown) but would leave the hero's
 * countdown slot blank while `ongoing` visually collapses into the Upcoming
 * treatment — this wraps it with the one small addition Home doesn't need:
 * "Starting now" for the window between kickoff and the countdown running
 * out, so the hero never shows a negative or missing duration.
 */
export function formatHeroCountdown(
  phase: "upcoming" | "ongoing",
  startsAt: Date,
  now: Date,
  locale: Locale,
): string | null {
  const countdown = formatHomeCountdown(startsAt, now, locale);
  if (countdown) {
    return countdown;
  }
  return phase === "ongoing"
    ? messagesFor(locale).dates.countdown.startingNow
    : null;
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
  const endClock = formatGameClockWithoutMeridiem(windowEnd, locale);
  return kickoff.meridiem
    ? m.meridiemUntil(kickoff.meridiem, endClock)
    : m.until(endClock);
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
  const clock = formatGameClock(startsAt, locale);
  const parts = clock.trim().split(/\s+/);
  const meridiem = parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  const time = parts.length > 1 ? parts.slice(0, -1).join(" ") : clock;
  const proximity = gameDayProximity(startsAt);
  const relativeDay =
    proximity === "today"
      ? m.tonightInSentence
      : proximity === "tomorrow"
        ? m.tomorrowInSentence
        : formatDayMonth(startsAt, locale, { weekday: "short" });

  return { time, meridiem, relativeDay };
}
