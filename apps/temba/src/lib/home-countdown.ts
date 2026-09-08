import {
  formatGameClockWithoutMeridiem,
  formatRelativeDay,
} from "~/lib/format-game-start";

const MINUTE_MS = 60_000;

/**
 * Live countdown for an upcoming Home game. Returns null when the start is
 * not in the future so the UI never shows a negative or zero-minute value.
 */
export function formatHomeCountdown(startsAt: Date, now: Date): string | null {
  const remainingMs = startsAt.getTime() - now.getTime();
  if (remainingMs <= 0) {
    return null;
  }

  const totalMinutes = Math.floor(remainingMs / MINUTE_MS);
  const dayMinutes = 24 * 60;
  if (totalMinutes >= dayMinutes) {
    const days = Math.floor(totalMinutes / dayMinutes);
    return days === 1 ? "in 1 day" : `in ${days} days`;
  }
  if (totalMinutes < 60) {
    return `in ${Math.max(1, totalMinutes)}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `in ${hours}h ${minutes}m`;
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
): string | null {
  const countdown = formatHomeCountdown(startsAt, now);
  if (countdown) {
    return countdown;
  }
  return phase === "ongoing" ? "Starting now" : null;
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
): string {
  const kickoff = formatHomeKickoff(startsAt);
  if (!windowEnd) {
    return kickoff.meridiem;
  }
  const endClock = formatGameClockWithoutMeridiem(windowEnd);
  return kickoff.meridiem
    ? `${kickoff.meridiem} until ${endClock}`
    : `until ${endClock}`;
}

export function formatHomeKickoff(startsAt: Date): {
  time: string;
  meridiem: string;
  relativeDay: string;
} {
  const clock = startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const parts = clock.trim().split(/\s+/);
  const meridiem = parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  const time = parts.length > 1 ? parts.slice(0, -1).join(" ") : clock;
  const relative = formatRelativeDay(startsAt, { sameDayLabel: "Tonight" });
  const relativeDay =
    relative === "Tonight"
      ? "tonight"
      : relative === "Tomorrow"
        ? "tomorrow"
        : relative;

  return { time, meridiem, relativeDay };
}
