import {
  formatDayMonth,
  formatGameClock,
} from "@repo/domain/format-game-start";
import { productDaysBetween } from "@repo/domain/product-timezone";

export type ClosureLike = {
  courtId: string | null;
  startsAt: Date;
  endsAt: Date;
};

export type CourtAvailability =
  | { kind: "bookable" }
  | { kind: "paused" }
  | { kind: "closed"; until: Date };

/** A Closure on the Court or on the whole Venue that covers `now` wins; the latest end is shown. */
export function courtAvailability(args: {
  courtId: string;
  closures: ClosureLike[];
  acceptingBookings: boolean;
  now: Date;
}): CourtAvailability {
  const time = args.now.getTime();
  let until: Date | null = null;
  for (const closure of args.closures) {
    const applies =
      closure.courtId === null || closure.courtId === args.courtId;
    const covers =
      closure.startsAt.getTime() <= time && closure.endsAt.getTime() > time;
    if (applies && covers && (!until || closure.endsAt > until)) {
      until = closure.endsAt;
    }
  }
  if (until) {
    return { kind: "closed", until };
  }
  return args.acceptingBookings ? { kind: "bookable" } : { kind: "paused" };
}

/** `Closed to 5:00 PM` today, otherwise `Closed to Sat 7 Nov`. */
export function closedUntilLabel(until: Date, now: Date) {
  if (productDaysBetween(now, until) === 0) {
    return `Closed to ${formatGameClock(until)}`;
  }
  return `Closed to ${formatDayMonth(until, { weekday: "short" })}`;
}
