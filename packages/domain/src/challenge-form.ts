import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { CHALLENGE_OPEN_DAYS } from "./challenge-clock";
import {
  formatDayMonth,
  formatGameClock,
  formatWeekday,
} from "./format-game-start";
import { sideSizeLabel } from "./game-shape";
import {
  LEVEL_BAND_SELECT_NONE,
  parseLevelBandSelectTenths,
  type LevelBandSelectValue,
} from "./level-range";
import {
  addProductDays,
  zonedDateTimeToInstant,
  zonedParts,
} from "./product-timezone";
import type { Sport } from "./sport";
import {
  FOOTBALL_CHALLENGE_SIDE_SIZES,
  teamCanPostFormat,
  teamRosterRule,
} from "./team-roster";

export const CHALLENGE_WEEKDAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type ChallengeWeekday = (typeof CHALLENGE_WEEKDAYS)[number];

export const CHALLENGE_TIMINGS = ["morning", "afternoon", "evening"] as const;

export type ChallengeTiming = (typeof CHALLENGE_TIMINGS)[number];

export const CHALLENGE_NOTE_MAX = 140;
export const CHALLENGE_MAX_VENUES = 3;
export const CHALLENGE_MAX_SLOTS = 3;

/** Reserves beyond the side on a Matchday squad. */
export const CHALLENGE_SQUAD_RESERVES = 3;

/** How long the Challenge Game runs; the Game window at confirm. */
export const CHALLENGE_DEFAULT_DURATION_MINUTES: Record<Sport, number> = {
  padel: 90,
  football: 60,
};

/** Exact slots are picked from the next two weeks, on the half hour. */
export const CHALLENGE_SLOT_DAYS = 14;
const SLOT_FIRST_MINUTES = 6 * 60;
const SLOT_LAST_MINUTES = 23 * 60;
const SLOT_STEP_MINUTES = 30;

export function isChallengeWeekday(value: string): value is ChallengeWeekday {
  return CHALLENGE_WEEKDAYS.some((day) => day === value);
}

export function isChallengeTiming(value: string): value is ChallengeTiming {
  return CHALLENGE_TIMINGS.some((timing) => timing === value);
}

export function challengeSquadSize(sideSize: number) {
  return sideSize + CHALLENGE_SQUAD_RESERVES;
}

export type ChallengeFormatProblem =
  | "format_required"
  | "format_on_padel"
  | "format_unknown"
  | "format_roster"
  | "padel_roster";

/**
 * Football needs a Format the Roster can field; padel has none and needs both
 * players. Shared by the post form and `challenges.post`.
 */
export function challengeFormatProblem(args: {
  sport: Sport;
  sideSize: number | null;
  rosterCount: number;
}): ChallengeFormatProblem | null {
  if (args.sport === "padel") {
    if (args.sideSize != null) {
      return "format_on_padel";
    }
    return args.rosterCount === teamRosterRule("padel").max
      ? null
      : "padel_roster";
  }
  if (args.sideSize == null) {
    return "format_required";
  }
  if (!FOOTBALL_CHALLENGE_SIDE_SIZES.some((side) => side === args.sideSize)) {
    return "format_unknown";
  }
  return teamCanPostFormat(args.rosterCount, args.sideSize)
    ? null
    : "format_roster";
}

export function challengeFormatMessage(
  problem: ChallengeFormatProblem,
  args: { sideSize: number | null; rosterCount: number },
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.errors;
  switch (problem) {
    case "format_required":
      return m.formatRequired;
    case "format_on_padel":
      return m.formatOnPadel;
    case "format_unknown":
      return m.formatUnknown;
    case "padel_roster":
      return m.padelRoster;
    case "format_roster":
      return m.formatRoster(
        sideSizeLabel(args.sideSize ?? 0, locale),
        args.rosterCount,
      );
  }
}

export function challengeNoteTooLong(note: string | null | undefined) {
  return (note?.trim().length ?? 0) > CHALLENGE_NOTE_MAX;
}

export function challengeLevelRangeInverted(
  levelMinTenths: number | null,
  levelMaxTenths: number | null,
) {
  return (
    levelMinTenths != null &&
    levelMaxTenths != null &&
    levelMinTenths > levelMaxTenths
  );
}

/** 5, 6 and 7-a-side, each disabled until the Roster can field it. */
export function challengeFormatOptions(rosterCount: number, locale: Locale) {
  const m = messagesFor(locale).challenge.post;
  return FOOTBALL_CHALLENGE_SIDE_SIZES.map((side) => {
    const label = sideSizeLabel(side, locale);
    const disabled = !teamCanPostFormat(rosterCount, side);
    return {
      value: side,
      label,
      disabled,
      accessibilityLabel: disabled ? m.formatNeeds(label, side) : label,
    };
  });
}

export function challengeWeekdayOptions(locale: Locale) {
  const m = messagesFor(locale).challenge;
  return CHALLENGE_WEEKDAYS.map((day) => ({
    value: day,
    label: m.weekdays[day],
    accessibilityLabel: m.weekdayNames[day],
  }));
}

export function challengeTimingOptions(locale: Locale) {
  const m = messagesFor(locale).challenge;
  return CHALLENGE_TIMINGS.map((timing) => ({
    value: timing,
    label: m.timings[timing],
    detail: m.timingHints[timing],
    accessibilityLabel: `${m.timings[timing]}${messagesFor(locale).group.metaSeparator}${m.timingHints[timing]}`,
  }));
}

/** The next two weeks, starting today, as product-day keys. */
export function challengeSlotDayOptions(now: Date, locale: Locale) {
  return Array.from({ length: CHALLENGE_SLOT_DAYS }, (_, offset) => {
    const day = addProductDays(now, offset);
    const { year, month, day: date } = zonedParts(day);
    return {
      value: `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`,
      label: formatDayMonth(day, locale, { weekday: "short" }),
      accessibilityLabel: `${formatWeekday(day, "long", locale)} ${formatDayMonth(day, locale)}`,
    };
  });
}

export function challengeSlotTimeOptions(locale: Locale) {
  const options: { value: number; label: string }[] = [];
  for (
    let minutes = SLOT_FIRST_MINUTES;
    minutes <= SLOT_LAST_MINUTES;
    minutes += SLOT_STEP_MINUTES
  ) {
    options.push({
      value: minutes,
      label: formatGameClock(
        challengeSlotInstant("2026-01-01", minutes),
        locale,
      ),
    });
  }
  return options;
}

/** The instant a product-day key and minutes after midnight name. */
export function challengeSlotInstant(dayKey: string, minutes: number) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return zonedDateTimeToInstant({
    year: year ?? Number.NaN,
    month: month ?? Number.NaN,
    day: day ?? Number.NaN,
    hour: Math.floor(minutes / 60),
    minute: minutes % 60,
  });
}

export type ChallengeDraft = {
  teamId: string | null;
  sideSize: number | null;
  venueIds: string[];
  days: ChallengeWeekday[];
  timings: ChallengeTiming[];
  exactSlots: Date[];
  levelMin: LevelBandSelectValue;
  levelMax: LevelBandSelectValue;
  note: string;
};

export type ChallengeDraftTeam = {
  id: string;
  displayName: string;
  sport: Sport;
  rosterCount: number;
};

export function emptyChallengeDraft(
  teamId: string | null = null,
): ChallengeDraft {
  return {
    teamId,
    sideSize: null,
    venueIds: [],
    days: [],
    timings: [],
    exactSlots: [],
    levelMin: LEVEL_BAND_SELECT_NONE,
    levelMax: LEVEL_BAND_SELECT_NONE,
    note: "",
  };
}

export type ChallengePostInput = {
  teamId: string;
  sideSize: number | null;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  venueIds: string[];
  days: ChallengeWeekday[];
  timings: ChallengeTiming[];
  exactSlots: Date[];
  note: string | null;
};

export type ChallengeDraftField =
  | "team"
  | "format"
  | "venues"
  | "slots"
  | "level"
  | "note";

export type ChallengeDraftResult =
  | { ok: true; input: ChallengePostInput }
  | { ok: false; errors: Partial<Record<ChallengeDraftField, string>> };

export function validateChallengeDraft(
  draft: ChallengeDraft,
  team: ChallengeDraftTeam | null,
  locale: Locale,
  now: Date,
): ChallengeDraftResult {
  const m = messagesFor(locale);
  const errors: Partial<Record<ChallengeDraftField, string>> = {};
  if (team?.id !== draft.teamId || !team) {
    return { ok: false, errors: { team: m.challenge.errors.pickTeam } };
  }
  const sideSize = team.sport === "football" ? draft.sideSize : null;
  const formatProblem = challengeFormatProblem({
    sport: team.sport,
    sideSize,
    rosterCount: team.rosterCount,
  });
  if (formatProblem) {
    errors.format = challengeFormatMessage(
      formatProblem,
      { sideSize, rosterCount: team.rosterCount },
      locale,
    );
  }
  if (draft.venueIds.length > CHALLENGE_MAX_VENUES) {
    errors.venues = m.challenge.errors.tooManyVenues(CHALLENGE_MAX_VENUES);
  }
  if (draft.exactSlots.length > CHALLENGE_MAX_SLOTS) {
    errors.slots = m.challenge.errors.tooManySlots(CHALLENGE_MAX_SLOTS);
  } else if (draft.exactSlots.some((slot) => slot.getTime() <= now.getTime())) {
    errors.slots = m.challenge.errors.slotPast;
  }
  const levelMinTenths = parseLevelBandSelectTenths(draft.levelMin, "min");
  const levelMaxTenths = parseLevelBandSelectTenths(draft.levelMax, "max");
  if (challengeLevelRangeInverted(levelMinTenths, levelMaxTenths)) {
    errors.level = m.level.rangeInverted;
  }
  if (challengeNoteTooLong(draft.note)) {
    errors.note = m.challenge.errors.noteTooLong(CHALLENGE_NOTE_MAX);
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  const note = draft.note.trim();
  return {
    ok: true,
    input: {
      teamId: team.id,
      sideSize,
      levelMinTenths,
      levelMaxTenths,
      venueIds: draft.venueIds,
      days: draft.days,
      timings: draft.timings,
      exactSlots: draft.exactSlots,
      note: note.length > 0 ? note : null,
    },
  };
}

/** The review screen's lines under the card: Team, Format, who sees it, how long, how Proposals work. */
export function challengeReviewLines(
  team: ChallengeDraftTeam,
  sideSize: number | null,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.review;
  const football = team.sport === "football";
  return [
    {
      key: "team",
      text: football
        ? m.teamWithRoster(team.displayName, team.rosterCount)
        : m.team(team.displayName),
    },
    football && sideSize != null
      ? {
          key: "format",
          text: m.format(
            sideSizeLabel(sideSize, locale),
            challengeSquadSize(sideSize),
          ),
        }
      : null,
    { key: "visibility", text: m.visibility[team.sport] },
    { key: "open", text: m.openFor(CHALLENGE_OPEN_DAYS) },
    { key: "proposals", text: m.proposals },
  ].filter((line): line is { key: string; text: string } => line != null);
}

/** "4 of 140" under the line field. */
export function challengeNoteCount(note: string, locale: Locale) {
  return messagesFor(locale).challenge.post.noteCount(
    note.trim().length,
    CHALLENGE_NOTE_MAX,
  );
}
