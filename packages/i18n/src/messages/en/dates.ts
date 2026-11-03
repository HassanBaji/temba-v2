import { plural } from "../../plural";

export const dates = {
  tonight: "Tonight",
  tonightInSentence: "tonight",
  tomorrowInSentence: "tomorrow",
  minutesCompact: (minutes: string) => `${minutes}m`,
  minutes: (n: number) => `${n} min`,
  windowDuration: (n: number) =>
    plural("en", n, { one: "1 minute", other: "{n} minutes" }),
  playedToday: "Played today",
  playedDaysAgo: (n: number) =>
    plural("en", n, { one: "Played 1 day ago", other: "Played {n} days ago" }),
  gameStart: (day: string, clock: string) => `${day}, ${clock}`,
  timeWindow: (start: string, end: string) => `${start} - ${end}`,
  countdown: {
    inDays: (n: number) =>
      plural("en", n, { one: "in 1 day", other: "in {n} days" }),
    inMinutes: (minutes: number) => `in ${minutes}m`,
    inHoursMinutes: (hours: number, minutes: number) =>
      `in ${hours}h ${minutes}m`,
    startingNow: "Starting now",
    until: (clock: string) => `until ${clock}`,
    meridiemUntil: (meridiem: string, clock: string) =>
      `${meridiem} until ${clock}`,
  },
};
