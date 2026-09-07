import { formatRelativeDay } from "~/lib/format-game-start";

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
  if (totalMinutes < 60) {
    return `in ${Math.max(1, totalMinutes)}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `in ${hours}h ${minutes}m`;
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
