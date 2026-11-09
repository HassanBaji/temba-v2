import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { ChallengeCardInput } from "./challenge-card";
import { CHALLENGE_OPEN_DAYS } from "./challenge-clock";
import {
  formatDayMonth,
  formatGameClock,
  formatGameStart,
  formatWeekday,
} from "./format-game-start";
import { sideSizeLabel } from "./game-shape";
import {
  ASSIGNABLE_DISPLAY_LEVEL_BANDS,
  displayLabelFromStoredBand,
  isAssignableDisplayLevelBand,
  type AssignableDisplayLevelBand,
} from "./level-bands";
import {
  isLevelBand,
  LEVEL_BAND_SELECT_NONE,
  parseLevelBandSelectTenths,
  tenthsToLevelBand,
  type LevelBandSelectValue,
} from "./level-range";
import { shortPlayerName } from "./player-name";
import {
  addProductDays,
  productDaysBetween,
  zonedDateTimeToInstant,
  zonedParts,
} from "./product-timezone";
import { sportLabel, type Sport } from "./sport";
import {
  FOOTBALL_CHALLENGE_SIDE_SIZES,
  formatsPlayable,
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

/** The day chips run Saturday to Friday, the week as it is lived here. */
export const CHALLENGE_DAY_CHIP_ORDER: readonly ChallengeWeekday[] = [
  "sat",
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
];

export function challengeWeekdayOptions(locale: Locale) {
  const m = messagesFor(locale).challenge;
  return CHALLENGE_DAY_CHIP_ORDER.map((day) => ({
    value: day,
    label: m.weekdays[day],
    accessibilityLabel: m.weekdayNames[day],
  }));
}

/** "Fri, Sat" beside the Days heading; "Any day" for none or all seven. */
export function challengeDaysHint(
  days: readonly ChallengeWeekday[],
  locale: Locale,
) {
  const m = messagesFor(locale).challenge;
  if (days.length === 0 || days.length === CHALLENGE_WEEKDAYS.length) {
    return m.when.anyDay;
  }
  return CHALLENGE_WEEKDAYS.filter((day) => days.includes(day))
    .map((day) => m.weekdays[day])
    .join(m.when.listSeparator);
}

export function challengeTimingOptions(locale: Locale) {
  const m = messagesFor(locale).challenge;
  return CHALLENGE_TIMINGS.map((timing) => ({
    value: timing,
    label: m.post.timingChips[timing],
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
  /** A Rematch: the Team played that it is also sent straight to. */
  nudgeTeamId: string | null;
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
    nudgeTeamId: null,
  };
}

/** A Team the posting Team has played, as `challenges.listPostOptions` lists it. */
export type ChallengePlayedTeam = {
  id: string;
  displayName: string | null;
  teamLevel: { tenths: number } | null;
  lastGame: { sideSize: number | null; venueId: string | null };
};

/** Level wanted one display band either side of a Team Level; any level without one. */
export function challengeLevelWantedAround(tenths: number | null): {
  levelMin: LevelBandSelectValue;
  levelMax: LevelBandSelectValue;
} {
  if (tenths == null) {
    return {
      levelMin: LEVEL_BAND_SELECT_NONE,
      levelMax: LEVEL_BAND_SELECT_NONE,
    };
  }
  const bands = ASSIGNABLE_DISPLAY_LEVEL_BANDS;
  const index = bands.indexOf(
    displayLabelFromStoredBand(tenthsToLevelBand(tenths)),
  );
  return {
    levelMin: bands[Math.max(0, index - 1)] ?? LEVEL_BAND_SELECT_NONE,
    levelMax:
      bands[Math.min(bands.length - 1, index + 1)] ?? LEVEL_BAND_SELECT_NONE,
  };
}

/**
 * Rematch pre-fills the post form from the Team played: the last Game's
 * Format while the Roster can still field it, its Venue while that still
 * offers the sport, a Level wanted around the opponent's Team Level, and the
 * nudge. Every field stays editable before Post.
 */
export function rematchChallengeDraft(
  team: ChallengeDraftTeam,
  opponent: ChallengePlayedTeam,
  sportVenueIds: readonly string[],
): ChallengeDraft {
  const side = opponent.lastGame.sideSize;
  const venueId = opponent.lastGame.venueId;
  return {
    ...emptyChallengeDraft(team.id),
    sideSize:
      team.sport === "football" &&
      side != null &&
      FOOTBALL_CHALLENGE_SIDE_SIZES.some((each) => each === side) &&
      teamCanPostFormat(team.rosterCount, side)
        ? side
        : null,
    venueIds: venueId && sportVenueIds.includes(venueId) ? [venueId] : [],
    ...challengeLevelWantedAround(opponent.teamLevel?.tenths ?? null),
    nudgeTeamId: opponent.id,
  };
}

/**
 * The review screen's "Also send it straight to a team you've played?": the
 * Teams played, newest first, and the one the nudge goes to, picked or the
 * most recent. Null when the Team has played nobody.
 */
export function challengeNudgeView(
  playedTeams: readonly Pick<ChallengePlayedTeam, "id" | "displayName">[],
  nudgeTeamId: string | null,
  locale: Locale,
) {
  const first = playedTeams[0];
  if (!first) {
    return null;
  }
  const m = messagesFor(locale);
  const name = (team: Pick<ChallengePlayedTeam, "displayName">) =>
    team.displayName ?? m.team.fallbackName;
  const picked = playedTeams.find((team) => team.id === nudgeTeamId) ?? null;
  return {
    title: m.challenge.review.nudge,
    before: m.challenge.review.nudgeBefore,
    teamName: name(picked ?? first),
    after: m.challenge.review.nudgeAfter,
    teamsLabel: m.challenge.review.nudgeTeams,
    on: picked != null,
    selected: picked?.id ?? null,
    firstTeamId: first.id,
    options: playedTeams.map((team) => ({ value: team.id, label: name(team) })),
  };
}

export type ChallengeNudgeView = NonNullable<
  ReturnType<typeof challengeNudgeView>
>;

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
  nudgeTeamId: string | null;
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
      nudgeTeamId: draft.nudgeTeamId,
    },
  };
}

/** "69 / 140" under the line field. */
export function challengeNoteCount(note: string, locale: Locale) {
  return messagesFor(locale).challenge.post.noteCount(
    note.trim().length,
    CHALLENGE_NOTE_MAX,
  );
}

/** A postable Team as `challenges.listPostOptions` lists it, as far as the form reads it. */
export type ChallengeFormTeam = ChallengeDraftTeam & {
  teamLevel: { tenths: number; level: string; band: string } | null;
  members: readonly { name: string | null; isViewer?: boolean }[];
  playedTeams: readonly ChallengePlayedTeam[];
};

export type ChallengeFormOptions = {
  teams: readonly ChallengeFormTeam[];
  venues: Record<Sport, readonly { id: string }[]>;
};

/**
 * The draft the form opens on: a Rematch pre-filled from the Team played, the
 * Team a link names, or the only Team that can post.
 */
export function challengeInitialDraft(
  options: ChallengeFormOptions,
  params: { teamId: string | null; opponentTeamId: string | null },
): ChallengeDraft {
  const team =
    options.teams.find((candidate) => candidate.id === params.teamId) ??
    (options.teams.length === 1 ? options.teams[0] : undefined);
  if (!team) {
    return emptyChallengeDraft();
  }
  const opponent = team.playedTeams.find(
    (candidate) => candidate.id === params.opponentTeamId,
  );
  if (opponent && team.id === params.teamId) {
    return rematchChallengeDraft(
      team,
      opponent,
      options.venues[team.sport].map((venue) => venue.id),
    );
  }
  return emptyChallengeDraft(team.id);
}

/**
 * Switching Team keeps what still applies: a Format the new Roster can field,
 * Venues of the same sport. The nudge belongs to the Team that played.
 */
export function challengeDraftWithTeam(
  draft: ChallengeDraft,
  teams: readonly ChallengeDraftTeam[],
  teamId: string,
): ChallengeDraft {
  const next = teams.find((candidate) => candidate.id === teamId);
  const previous = teams.find((candidate) => candidate.id === draft.teamId);
  const playable = next ? formatsPlayable(next.rosterCount) : [];
  return {
    ...draft,
    teamId,
    sideSize:
      next?.sport === "football" &&
      playable.some((side) => side === draft.sideSize)
        ? draft.sideSize
        : null,
    venueIds: previous && previous.sport === next?.sport ? draft.venueIds : [],
    nudgeTeamId: teamId === draft.teamId ? draft.nudgeTeamId : null,
  };
}

/**
 * A Team choice card: "Padel, C+, you and Ali M" or "Football, C. 12 on the
 * roster".
 */
export function challengeTeamChoice(team: ChallengeFormTeam, locale: Locale) {
  const m = messagesFor(locale);
  const copy = m.challenge.post;
  const separator = m.challenge.card.partSeparator;
  const sportAndLevel = [sportLabel(team.sport, locale), team.teamLevel?.band]
    .filter((part): part is string => part != null)
    .join(separator);
  let detail: string;
  if (team.sport === "football") {
    detail = copy.teamFootball(
      sportAndLevel,
      m.team.onRoster(team.rosterCount),
    );
  } else {
    const names = [...team.members]
      .sort((a, b) => Number(Boolean(b.isViewer)) - Number(Boolean(a.isViewer)))
      .map((member) =>
        member.isViewer
          ? copy.you
          : shortPlayerName(member.name ?? m.team.memberFallback),
      );
    const [first, second] = names;
    const pair =
      first && second ? copy.teamPair(first, second) : (first ?? null);
    detail = [sportAndLevel, pair]
      .filter((part): part is string => part != null)
      .join(separator);
  }
  return {
    value: team.id,
    title: team.displayName,
    detail,
    accessibilityLabel: `${team.displayName}${m.group.metaSeparator}${detail}`,
  };
}

/** "roster 12 of 20" beside the Format heading. */
export function challengeRosterHint(rosterCount: number, locale: Locale) {
  return messagesFor(locale).challenge.post.rosterOf(
    rosterCount,
    teamRosterRule("football").max,
  );
}

/** Under the Format boxes: what the Roster can field, then how squads are named. */
export function challengeFormatHelp(
  team: Pick<ChallengeDraftTeam, "displayName" | "rosterCount">,
  sideSize: number | null,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const copy = m.challenge.post;
  const roster = m.team.onRoster(team.rosterCount);
  const playable = formatsPlayable(team.rosterCount);
  const fields =
    playable.length === FOOTBALL_CHALLENGE_SIDE_SIZES.length
      ? copy.formatRosterAll(team.displayName, roster)
      : copy.formatRosterSome(
          team.displayName,
          roster,
          copy.formatList(playable),
        );
  const squads =
    sideSize == null
      ? copy.formatSquadAny(CHALLENGE_SQUAD_RESERVES)
      : copy.formatSquad(sideSize, CHALLENGE_SQUAD_RESERVES);
  return `${fields} ${squads}`;
}

/**
 * Preferred venues: the sport's Venues, at most three picked, and the
 * "Anywhere" chip that clears them, named for the area when every Venue is
 * in one city.
 */
export function challengeVenueChoice(
  venues: readonly { id: string; name: string; city: string }[],
  picked: readonly string[],
  locale: Locale,
) {
  const copy = messagesFor(locale).challenge.post;
  const full = picked.length >= CHALLENGE_MAX_VENUES;
  const cities = [...new Set(venues.map((venue) => venue.city.trim()))];
  const city = cities.length === 1 ? cities[0] : undefined;
  return {
    chips: venues.map((venue) => ({
      value: venue.id,
      label: venue.name,
      disabled: full && !picked.includes(venue.id),
    })),
    anywhere: {
      label: city ? copy.anywhereIn(city) : copy.anywhere,
      selected: picked.length === 0,
    },
    hint:
      picked.length > 0
        ? copy.venuesPicked(picked.length)
        : copy.venuesUpTo(CHALLENGE_MAX_VENUES),
  };
}

export const CHALLENGE_LEVEL_CHIPS = 6;

const LEVEL_CHIP_LEAD = 2;

type ChallengeLevelRange = Pick<ChallengeDraft, "levelMin" | "levelMax">;

function bandIndex(value: LevelBandSelectValue): number | null {
  const band = isAssignableDisplayLevelBand(value)
    ? value
    : isLevelBand(value)
      ? displayLabelFromStoredBand(value)
      : null;
  return band == null ? null : ASSIGNABLE_DISPLAY_LEVEL_BANDS.indexOf(band);
}

/** The picked bands as indexes; one bound alone reads as that band. */
function rangeIndexes(range: ChallengeLevelRange) {
  const min = bandIndex(range.levelMin);
  const max = bandIndex(range.levelMax);
  const low = min ?? max;
  const high = max ?? min;
  return low == null || high == null
    ? null
    : { low: Math.min(low, high), high: Math.max(low, high) };
}

/**
 * Six band chips around the Team Level, two below and three above, moved to
 * take in what is already picked.
 */
export function challengeLevelChips(
  teamTenths: number | null,
  range: ChallengeLevelRange,
): AssignableDisplayLevelBand[] {
  const bands = ASSIGNABLE_DISPLAY_LEVEL_BANDS;
  const picked = rangeIndexes(range);
  const anchor =
    teamTenths != null
      ? bands.indexOf(displayLabelFromStoredBand(tenthsToLevelBand(teamTenths)))
      : picked
        ? picked.low
        : Math.floor(bands.length / 2);
  const lastStart = bands.length - CHALLENGE_LEVEL_CHIPS;
  let start = Math.min(Math.max(anchor - LEVEL_CHIP_LEAD, 0), lastStart);
  let end = start + CHALLENGE_LEVEL_CHIPS - 1;
  if (picked) {
    if (picked.low < start) {
      start = picked.low;
      end = Math.max(picked.high, start + CHALLENGE_LEVEL_CHIPS - 1);
    } else if (picked.high > end) {
      end = picked.high;
      start = Math.min(picked.low, end - CHALLENGE_LEVEL_CHIPS + 1);
    }
  }
  return bands.slice(Math.max(start, 0), end + 1);
}

export function challengeLevelSelected(
  range: ChallengeLevelRange,
  band: AssignableDisplayLevelBand,
) {
  const picked = rangeIndexes(range);
  const index = ASSIGNABLE_DISPLAY_LEVEL_BANDS.indexOf(band);
  return picked != null && index >= picked.low && index <= picked.high;
}

/**
 * Level wanted is one run of bands. A band outside the run stretches it; an
 * end band shrinks it; a band inside it starts again from that band; the
 * only band picked clears it to any level.
 */
export function challengeLevelTap(
  range: ChallengeLevelRange,
  band: AssignableDisplayLevelBand,
): ChallengeLevelRange {
  const bands = ASSIGNABLE_DISPLAY_LEVEL_BANDS;
  const index = bands.indexOf(band);
  const picked = rangeIndexes(range);
  const span = (low: number, high: number): ChallengeLevelRange => ({
    levelMin: bands[low] ?? LEVEL_BAND_SELECT_NONE,
    levelMax: bands[high] ?? LEVEL_BAND_SELECT_NONE,
  });
  if (!picked) {
    return span(index, index);
  }
  if (index < picked.low) {
    return span(index, picked.high);
  }
  if (index > picked.high) {
    return span(picked.low, index);
  }
  if (picked.low === picked.high) {
    return {
      levelMin: LEVEL_BAND_SELECT_NONE,
      levelMax: LEVEL_BAND_SELECT_NONE,
    };
  }
  if (index === picked.low) {
    return span(index + 1, picked.high);
  }
  if (index === picked.high) {
    return span(picked.low, index - 1);
  }
  return span(index, index);
}

function levelRangeText(
  min: string | null,
  max: string | null,
  locale: Locale,
) {
  const copy = messagesFor(locale).challenge.post;
  if (min && max) {
    return min === max ? min : copy.levelRange(min, max);
  }
  if (min) {
    return copy.levelAndUp(min);
  }
  if (max) {
    return copy.levelAndUnder(max);
  }
  return null;
}

/** "C to B-" beside the Level wanted heading; "Any level" for none. */
export function challengeLevelHint(range: ChallengeLevelRange, locale: Locale) {
  const picked = rangeIndexes(range);
  const bands = ASSIGNABLE_DISPLAY_LEVEL_BANDS;
  return (
    (picked
      ? levelRangeText(
          bands[picked.low] ?? null,
          bands[picked.high] ?? null,
          locale,
        )
      : null) ?? messagesFor(locale).challenge.post.anyLevel
  );
}

/** An exact slot chip: "Thu 8:00 PM" this week, the full date further out. */
export function challengeSlotLabel(slot: Date, now: Date, locale: Locale) {
  if (productDaysBetween(now, slot) < CHALLENGE_WEEKDAYS.length) {
    return messagesFor(locale).challenge.post.slotLabel(
      formatWeekday(slot, "short", locale),
      formatGameClock(slot, locale),
    );
  }
  return formatGameStart(slot, locale);
}

function tenthsBand(tenths: number | null) {
  return tenths == null
    ? null
    : displayLabelFromStoredBand(tenthsToLevelBand(tenths));
}

/** The review list: Team, Format, who sees it, how long, how Proposals work. */
export function challengeReviewRows(
  team: ChallengeDraftTeam,
  input: Pick<
    ChallengePostInput,
    "sideSize" | "levelMinTenths" | "levelMaxTenths"
  >,
  venues: readonly { city: string }[],
  locale: Locale,
) {
  const m = messagesFor(locale);
  const copy = m.challenge.review;
  const football = team.sport === "football";
  const cities = [...new Set(venues.map((venue) => venue.city.trim()))];
  const level = levelRangeText(
    tenthsBand(input.levelMinTenths),
    tenthsBand(input.levelMaxTenths),
    locale,
  );
  const narrowed = [
    level,
    cities.length > 0
      ? copy.inArea(cities.join(m.challenge.when.listSeparator))
      : null,
  ].filter((part): part is string => part != null);
  return [
    {
      key: "team",
      label: copy.rows.team,
      value: football
        ? copy.team(team.displayName, m.team.onRoster(team.rosterCount))
        : team.displayName,
    },
    football && input.sideSize != null
      ? {
          key: "format",
          label: copy.rows.format,
          value: copy.format(
            sideSizeLabel(input.sideSize, locale),
            challengeSquadSize(input.sideSize),
          ),
        }
      : null,
    {
      key: "visibility",
      label: copy.rows.visibleTo,
      value:
        narrowed.length === 0
          ? copy.visibleEvery[team.sport]
          : [copy.visibleTeams[team.sport], ...narrowed].join(
              m.challenge.card.partSeparator,
            ),
    },
    {
      key: "open",
      label: copy.rows.openFor,
      value: copy.openFor(CHALLENGE_OPEN_DAYS),
    },
    { key: "proposals", label: copy.rows.proposals, value: copy.proposals },
  ].filter(
    (row): row is { key: string; label: string; value: string } => row != null,
  );
}

/** The review card: the Team's own Challenge, as other Teams will see it. */
export function challengePreviewCardInput(
  team: Pick<ChallengeFormTeam, "displayName" | "sport" | "rosterCount"> & {
    teamLevel: ChallengeCardInput["team"]["teamLevel"];
    members: readonly { name: string | null }[];
  },
  input: ChallengePostInput,
  venues: readonly { id: string; name: string }[],
  expiresAt: Date,
): ChallengeCardInput {
  return {
    id: "preview",
    sport: team.sport,
    sideSize: input.sideSize,
    levelMinTenths: input.levelMinTenths,
    levelMaxTenths: input.levelMaxTenths,
    days: input.days,
    timings: input.timings,
    exactSlots: input.exactSlots,
    venues: venues.filter((venue) => input.venueIds.includes(venue.id)),
    note: input.note,
    proposalCount: 0,
    expiresAt,
    team: {
      displayName: team.displayName,
      rosterCount: team.rosterCount,
      teamLevel: team.teamLevel,
      members: team.members,
    },
    viewer: { ineligibleReason: null },
  };
}
