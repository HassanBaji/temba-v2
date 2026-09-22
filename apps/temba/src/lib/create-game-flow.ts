import {
  ASSIGNABLE_DISPLAY_LEVEL_BANDS,
  isAssignableDisplayLevelBand,
  type AssignableDisplayLevelBand,
} from "~/lib/level-bands";
import {
  LEVEL_BAND_SELECT_NONE,
  type LevelBandSelectValue,
} from "~/lib/level-range";
import {
  earliestGameWindowDay,
  formatDayLabel,
  formatDateInputValue,
  GAME_WINDOW_TIME_SLOTS,
  GAME_WINDOW_TIME_STEP_MINUTES,
  parseDateInputValue,
  parseRequiredGameWindow,
  upcomingGameWindowTimeSlots,
} from "~/lib/game-window";
import {
  formatHeroKickoffTrailer,
  formatHomeKickoff,
} from "~/lib/home-countdown";
import {
  formatPricePerPlayerCents,
  parseOptionalPricePerPlayerCents,
} from "~/lib/price-per-player";
import { oneDayFit, type TournamentSizing } from "~/lib/tournament-sizing";

export const CREATE_FLOW_STEP_COUNT = 4;

export type CreateFlowStep = 1 | 2 | 3 | 4;

export type CreateGameTypeId = "friendly_game" | "friendly_tournament";

export const CREATE_GAME_TYPE_CARDS: readonly {
  id: CreateGameTypeId;
  title: string;
  description: string;
  rating: string;
}[] = [
  {
    id: "friendly_game",
    title: "Friendly game",
    description: "One Match. Temba fills the open seats.",
    rating: "Counts for your rating",
  },
  {
    id: "friendly_tournament",
    title: "Friendly tournament",
    description: "Several Game teams over one day.",
    rating: "Counts for your rating",
  },
];

export const FRIENDLY_GAME_LATER_STEPS: readonly {
  step: Exclude<CreateFlowStep, 1>;
  title: string;
}[] = [
  { step: 2, title: "Where" },
  { step: 3, title: "When" },
  { step: 4, title: "Level and price" },
];

export const FRIENDLY_TOURNAMENT_LATER_STEPS: readonly {
  step: Exclude<CreateFlowStep, 1>;
  title: string;
}[] = [
  { step: 2, title: "Where and size" },
  { step: 3, title: "Format and day" },
  { step: 4, title: "Entry and review" },
];

export function createFlowLaterSteps(type: CreateGameTypeId | null) {
  if (type === "friendly_tournament") {
    return FRIENDLY_TOURNAMENT_LATER_STEPS;
  }
  return FRIENDLY_GAME_LATER_STEPS;
}

export const CREATE_FLOW_OPEN_SEATS_LABEL = "4 open seats";

export const CREATE_FLOW_DURATIONS = [60, 90, 120] as const;

export const CREATE_FLOW_MATCH_MINUTE_CHIPS = [20, 30, 45] as const;

export const DEFAULT_MATCH_MINUTES = 45;

export const FRIENDLY_TOURNAMENT_UNEVEN_GROUPS =
  "Groups are uneven. Some Game teams play one more Match than others.";

const MATCH_MINUTES_MESSAGE =
  "Match length must be from 10 to 120 minutes, in steps of 5";

export type CreateFlowDuration = (typeof CREATE_FLOW_DURATIONS)[number];

export const VISIBLE_GROUP_CHIP_COUNT = 3;

export const VISIBLE_START_SLOT_COUNT = 7;

export const CREATE_FLOW_FIELD_IDS: Record<string, string> = {
  groupId: "game-group",
  venueId: "game-venue",
  courtId: "game-court",
  courtIds: "game-court",
  pricePerPlayerCents: "game-price-per-player",
  levelMinTenths: "game-level-min",
  levelMaxTenths: "game-level-max",
  windowStart: "game-window-start",
  windowEnd: "game-window-finish",
  teamCount: "tournament-team-count",
  poolCount: "tournament-pool-count",
  matchMinutes: "tournament-match-minutes",
  name: "tournament-name",
};

const STEP_TWO_FIELDS = new Set([
  "groupId",
  "venueId",
  "courtId",
  "courtIds",
  "teamCount",
]);

const STEP_THREE_FIELDS = new Set([
  "windowStart",
  "windowEnd",
  "poolCount",
  "matchMinutes",
]);

export function createFlowStepForField(field: string): CreateFlowStep {
  if (STEP_TWO_FIELDS.has(field)) {
    return 2;
  }
  if (STEP_THREE_FIELDS.has(field) || field.startsWith("window")) {
    return 3;
  }
  return 4;
}

export type FriendlyGameDraft = {
  groupId: string;
  venueId: string;
  day: string;
  startTime: string;
  finishTime: string;
};

export type CreateFlowFieldIssue = {
  ok: false;
  field: string;
  message: string;
  elementId: string;
};

export function validateFriendlyGameWhere(
  groupId: string,
  venueId: string,
): { ok: true } | CreateFlowFieldIssue {
  if (!groupId) {
    return {
      ok: false,
      field: "groupId",
      message: "Pick a Group",
      elementId: CREATE_FLOW_FIELD_IDS.groupId ?? "game-group",
    };
  }
  if (!venueId) {
    return {
      ok: false,
      field: "venueId",
      message: "Pick a Venue",
      elementId: CREATE_FLOW_FIELD_IDS.venueId ?? "game-venue",
    };
  }
  return { ok: true };
}

export function validateFriendlyGameWhen(
  day: string,
  startTime: string,
  finishTime: string,
  now: Date = new Date(),
): { ok: true; windowStart: Date; windowEnd: Date } | CreateFlowFieldIssue {
  if (!parseDateInputValue(day)) {
    return {
      ok: false,
      field: "windowStart",
      message: "Pick a day",
      elementId: "game-window-day",
    };
  }
  const slots = upcomingGameWindowTimeSlots(day, now);
  if (!startTime || !slots.includes(startTime)) {
    return {
      ok: false,
      field: "windowStart",
      message: "Pick a start time",
      elementId: CREATE_FLOW_FIELD_IDS.windowStart ?? "game-window-start",
    };
  }
  if (!finishTime || !slots.includes(finishTime)) {
    return {
      ok: false,
      field: "windowEnd",
      message: "Pick a finish time",
      elementId: CREATE_FLOW_FIELD_IDS.windowEnd ?? "game-window-finish",
    };
  }
  if (finishTime < startTime) {
    return {
      ok: false,
      field: "windowEnd",
      message: "Finish time must be at or after start time",
      elementId: CREATE_FLOW_FIELD_IDS.windowEnd ?? "game-window-finish",
    };
  }
  const parsed = parseRequiredGameWindow(day, startTime, finishTime);
  if (!parsed) {
    return {
      ok: false,
      field: "windowEnd",
      message: "Pick a finish time",
      elementId: CREATE_FLOW_FIELD_IDS.windowEnd ?? "game-window-finish",
    };
  }
  return { ok: true, ...parsed };
}

export function parseCreateMatchMinutes(
  value: string,
): { ok: true; minutes: number } | { ok: false; message: string } {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, message: MATCH_MINUTES_MESSAGE };
  }
  const minutes = Number(trimmed);
  if (minutes < 10 || minutes > 120 || minutes % 5 !== 0) {
    return { ok: false, message: MATCH_MINUTES_MESSAGE };
  }
  return { ok: true, minutes };
}

export function validateTournamentName(
  name: string,
): { ok: true; name: string } | CreateFlowFieldIssue {
  const trimmed = name.trim();
  if (!trimmed) {
    return {
      ok: false,
      field: "name",
      message: "Name the tournament",
      elementId: "tournament-name",
    };
  }
  return { ok: true, name: trimmed };
}

export function firstIncompleteFriendlyTournamentStep(
  draft: FriendlyGameDraft & { matchMinutes: string },
  now: Date = new Date(),
): 2 | 3 | 4 {
  if (!draft.groupId || !draft.venueId) {
    return 2;
  }
  if (
    !validateFriendlyGameWhen(draft.day, draft.startTime, draft.finishTime, now)
      .ok
  ) {
    return 3;
  }
  if (!parseCreateMatchMinutes(draft.matchMinutes).ok) {
    return 3;
  }
  return 4;
}

export function firstIncompleteFriendlyGameStep(
  draft: FriendlyGameDraft,
  now: Date = new Date(),
): 2 | 3 | 4 {
  if (!draft.groupId || !draft.venueId) {
    return 2;
  }
  if (
    !validateFriendlyGameWhen(draft.day, draft.startTime, draft.finishTime, now)
      .ok
  ) {
    return 3;
  }
  return 4;
}

export function resolveCreateFlowStep(input: {
  type: CreateGameTypeId | null;
  requestedStep: CreateFlowStep | null;
  draft: FriendlyGameDraft & { matchMinutes?: string };
  now?: Date;
}): CreateFlowStep {
  if (input.type == null) {
    return 1;
  }
  if (input.requestedStep == null) {
    return 2;
  }
  if (input.requestedStep === 1) {
    return 1;
  }
  const first =
    input.type === "friendly_tournament"
      ? firstIncompleteFriendlyTournamentStep(
          {
            ...input.draft,
            matchMinutes:
              input.draft.matchMinutes ?? String(DEFAULT_MATCH_MINUTES),
          },
          input.now,
        )
      : firstIncompleteFriendlyGameStep(input.draft, input.now);
  return input.requestedStep > first ? first : input.requestedStep;
}

export function parseCreateFlowType(
  value: string | null,
): CreateGameTypeId | null {
  if (value === "friendly_game" || value === "friendly_tournament") {
    return value;
  }
  return null;
}

export function parseCreateFlowStep(
  value: string | null,
): CreateFlowStep | null {
  if (value === "1" || value === "2" || value === "3" || value === "4") {
    return Number(value) as CreateFlowStep;
  }
  return null;
}

export function createGameFlowHref(input: {
  groupId?: string;
  type?: CreateGameTypeId | null;
  step?: CreateFlowStep | null;
}) {
  const params = new URLSearchParams();
  if (input.groupId) {
    params.set("groupId", input.groupId);
  }
  if (input.type) {
    params.set("type", input.type);
  }
  if (input.step) {
    params.set("step", String(input.step));
  }
  const query = params.toString();
  return query.length > 0
    ? `/dashboard/games/new?${query}`
    : "/dashboard/games/new";
}

export function friendlyTournamentCreateHref(groupId?: string) {
  return createGameFlowHref({
    groupId,
    type: "friendly_tournament",
  });
}

export function createVenueCopy(
  picker: {
    locked: boolean;
    groupKind: "club" | "loose" | "none";
    venues: { archivedAt: Date | string | null }[];
  },
  options?: { manyCourts?: boolean },
) {
  const optional = options?.manyCourts
    ? "Courts are optional."
    : "Court is optional.";
  const skip = options?.manyCourts ? "Skip Courts." : "Skip Court.";
  if (picker.locked) {
    if (picker.venues[0]?.archivedAt) {
      return `This Community’s linked Venue is Soft-archived. You can still create this Game here. ${skip}`;
    }
    return `Venue is this Community’s linked Venue and cannot be changed. ${optional}`;
  }
  if (picker.groupKind === "club") {
    return `This Community has no Venue link. Pick a Venue. ${optional}`;
  }
  return `Pick a Venue. ${optional}`;
}

export function venueCardMeta(courtCount: number, city: string) {
  const courts = courtCount === 1 ? "1 Court" : `${courtCount} Courts`;
  return `${courts} · ${city}`;
}

export function visibleCreateGroups<T extends { id: string }>(
  groups: readonly T[],
  selectedId: string,
  count = VISIBLE_GROUP_CHIP_COUNT,
): T[] {
  const head = groups.slice(0, count);
  if (!selectedId || head.some((group) => group.id === selectedId)) {
    return [...head];
  }
  const selected = groups.find((group) => group.id === selectedId);
  if (!selected) {
    return [...head];
  }
  return [selected, ...head.filter((group) => group.id !== selected.id)].slice(
    0,
    count,
  );
}

export function createFlowDayOptions(
  now: Date = new Date(),
  count = 5,
): Date[] {
  const start = earliestGameWindowDay(now);
  return Array.from({ length: count }, (_, index) => {
    return new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + index,
    );
  });
}

export function previewStartSlots(
  slots: readonly string[],
  selected: string,
  expanded: boolean,
): readonly string[] {
  if (expanded || slots.length <= VISIBLE_START_SLOT_COUNT) {
    return slots;
  }
  const head = slots.slice(0, VISIBLE_START_SLOT_COUNT);
  if (selected && slots.includes(selected) && !head.includes(selected)) {
    return [...head.slice(0, VISIBLE_START_SLOT_COUNT - 1), selected];
  }
  return head;
}

export function finishSlotForDuration(
  startTime: string,
  minutes: number,
): string | null {
  const startIndex = GAME_WINDOW_TIME_SLOTS.indexOf(startTime);
  if (startIndex < 0 || minutes % GAME_WINDOW_TIME_STEP_MINUTES !== 0) {
    return null;
  }
  const steps = minutes / GAME_WINDOW_TIME_STEP_MINUTES;
  return GAME_WINDOW_TIME_SLOTS[startIndex + steps] ?? null;
}

export function matchingDurationPreset(
  startTime: string,
  finishTime: string,
): CreateFlowDuration | null {
  const startIndex = GAME_WINDOW_TIME_SLOTS.indexOf(startTime);
  const finishIndex = GAME_WINDOW_TIME_SLOTS.indexOf(finishTime);
  if (startIndex < 0 || finishIndex < 0) {
    return null;
  }
  const minutes = (finishIndex - startIndex) * GAME_WINDOW_TIME_STEP_MINUTES;
  return CREATE_FLOW_DURATIONS.find((preset) => preset === minutes) ?? null;
}

export function friendlyGameKickoff(
  day: string,
  startTime: string,
  finishTime: string,
): { time: string; trailer: string } | null {
  const parsed = parseRequiredGameWindow(day, startTime, finishTime);
  if (!parsed || parsed.windowEnd.getTime() < parsed.windowStart.getTime()) {
    return null;
  }
  const kickoff = formatHomeKickoff(parsed.windowStart);
  return {
    time: kickoff.time,
    trailer: formatHeroKickoffTrailer(parsed.windowStart, parsed.windowEnd),
  };
}

export function friendlyGamePreviewLine(input: {
  day: string;
  groupName: string | null;
  venueName: string | null;
  courtName: string | null;
}) {
  const dayLabel = input.day ? formatDayLabel(input.day) : null;
  const place = input.venueName ?? input.groupName;
  return [dayLabel, place, input.courtName]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export function levelBandIndex(value: string): number | null {
  if (!isAssignableDisplayLevelBand(value)) {
    return null;
  }
  return ASSIGNABLE_DISPLAY_LEVEL_BANDS.indexOf(value);
}

export function applyLevelBoundChange(
  current: { min: LevelBandSelectValue; max: LevelBandSelectValue },
  bound: "min" | "max",
  next: LevelBandSelectValue,
): { min: LevelBandSelectValue; max: LevelBandSelectValue } {
  const min = bound === "min" ? next : current.min;
  const max = bound === "max" ? next : current.max;
  const minIndex = levelBandIndex(min);
  const maxIndex = levelBandIndex(max);
  if (minIndex == null || maxIndex == null || minIndex <= maxIndex) {
    return { min, max };
  }
  return { min: next, max: next };
}

export function isLevelBoundDisabled(
  bound: "min" | "max",
  band: AssignableDisplayLevelBand,
  other: LevelBandSelectValue,
): boolean {
  const bandIndex = levelBandIndex(band);
  const otherIndex = levelBandIndex(other);
  if (bandIndex == null || otherIndex == null) {
    return false;
  }
  return bound === "min" ? bandIndex > otherIndex : bandIndex < otherIndex;
}

export const CREATE_FLOW_PRICE_CHIPS: readonly {
  label: string;
  value: string;
}[] = [
  { label: "Free", value: "0" },
  { label: "3.500", value: "3.50" },
  { label: "4.250", value: "4.25" },
  { label: "4.500", value: "4.50" },
  { label: "5.250", value: "5.25" },
  { label: "6.000", value: "6.00" },
  { label: "6.500", value: "6.50" },
  { label: "7.000", value: "7.00" },
  { label: "7.500", value: "7.50" },
];

export function priceChipIsSelected(chipValue: string, input: string) {
  const chip = parseOptionalPricePerPlayerCents(chipValue);
  const current = parseOptionalPricePerPlayerCents(input);
  if (!chip.ok || !current.ok || chip.cents == null || current.cents == null) {
    return false;
  }
  return chip.cents === current.cents;
}

export function dayChipValue(date: Date) {
  return formatDateInputValue(date);
}

export function earliestCreateDay(now: Date = new Date()) {
  return formatDateInputValue(earliestGameWindowDay(now));
}

export function openLevelRange(): {
  min: LevelBandSelectValue;
  max: LevelBandSelectValue;
} {
  return { min: LEVEL_BAND_SELECT_NONE, max: LEVEL_BAND_SELECT_NONE };
}

export function friendlyTournamentDayLabel(day: string) {
  const date = parseDateInputValue(day);
  if (!date) {
    return null;
  }
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function friendlyTournamentDefaultName(day: string) {
  const label = friendlyTournamentDayLabel(day);
  return label ? `Friendly tournament · ${label}` : "Friendly tournament";
}

export function friendlyTournamentGroupsLine(sizing: TournamentSizing) {
  const counts = new Map<number, number>();
  for (const size of sizing.poolSizes) {
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }
  const sizes = [...counts.entries()]
    .map(
      ([size, count]) =>
        `${count} ${count === 1 ? "group" : "groups"} of ${size}`,
    )
    .join(", ");
  if (sizing.matchesPerTeamMin !== sizing.matchesPerTeamMax) {
    return sizes;
  }
  const games = sizing.matchesPerTeamMin;
  return `${sizes}, ${games} ${games === 1 ? "game" : "games"} each`;
}

export function friendlyTournamentFormatLabel(poolCount: number) {
  return poolCount === 1 ? "1 group" : `${poolCount} groups`;
}

export function friendlyTournamentMatchCountLabel(poolMatches: number) {
  return poolMatches === 1 ? "1 group Match" : `${poolMatches} group Matches`;
}

export function friendlyTournamentScheduleLine(
  poolMatches: number,
  clock: string,
) {
  return `${friendlyTournamentMatchCountLabel(poolMatches)}, last Match finishes at ${clock}`;
}

export function friendlyTournamentSchedule(input: {
  start: Date;
  finish: Date;
  poolMatches: number;
  courtCount: number;
  matchMinutes: number;
  clock: (date: Date) => string;
}): { line: string | null; overruns: boolean } {
  const fit = oneDayFit({
    start: input.start,
    finish: input.finish,
    poolMatches: input.poolMatches,
    courtCount: input.courtCount,
    matchMinutes: input.matchMinutes,
  });
  return {
    line: fit.lastFinish
      ? friendlyTournamentScheduleLine(
          input.poolMatches,
          input.clock(fit.lastFinish),
        )
      : null,
    overruns: fit.overruns,
  };
}

export function friendlyTournamentPreviewDetail(input: {
  day: string;
  venueName: string | null;
  courtNames: readonly string[];
}) {
  const dayLabel = input.day ? friendlyTournamentDayLabel(input.day) : null;
  const courts =
    input.courtNames.length > 0 ? input.courtNames.join(", ") : null;
  return [dayLabel, input.venueName, courts]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export function friendlyTournamentCourtsLabel(names: readonly string[]) {
  if (names.length === 0) {
    return "None";
  }
  return names.join(", ");
}

export function gameTeamOfTwoCopy(price: string) {
  const parsed = parseOptionalPricePerPlayerCents(price);
  if (!parsed.ok || parsed.cents == null) {
    return null;
  }
  const doubled = parsed.cents * 2;
  if (doubled === 0) {
    return "0.00 BD a Game team of two";
  }
  const formatted = formatPricePerPlayerCents(doubled);
  if (!formatted) {
    return null;
  }
  return `${formatted} a Game team of two`;
}
