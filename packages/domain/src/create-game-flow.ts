import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatDayMonth, formatWeekday } from "./format-game-start";
import { addProductDays } from "./product-timezone";
import {
  ASSIGNABLE_DISPLAY_LEVEL_BANDS,
  isAssignableDisplayLevelBand,
  type AssignableDisplayLevelBand,
} from "./level-bands";
import {
  LEVEL_BAND_SELECT_NONE,
  type LevelBandSelectValue,
} from "./level-range";
import {
  earliestGameWindowDay,
  formatDayLabel,
  formatDateInputValue,
  GAME_WINDOW_FINISH_SLOTS,
  GAME_WINDOW_TIME_SLOTS,
  GAME_WINDOW_TIME_STEP_MINUTES,
  parseDateInputValue,
  parseRequiredGameWindow,
  timeSlotFromMinutes,
  timeSlotMinutes,
  upcomingGameWindowTimeSlots,
} from "./game-window";
import { formatHeroKickoffTrailer, formatHomeKickoff } from "./home-countdown";
import {
  formatPricePerPlayerFils,
  parseOptionalPricePerPlayerFils,
} from "./price-per-player";
import {
  DEFAULT_QUALIFIERS_PER_POOL,
  defaultPoolCount,
  formatPoolSizeLine,
  oneDayFit,
  TOURNAMENT_DEFAULT_TEAM_COUNT,
  type TournamentSizing,
} from "./tournament-sizing";
import type { CreateGameDraft } from "./create-game-draft";
import { courtCountLabel } from "./court-sport-copy";
import { footballSizeLabel } from "./football-size-copy";
import {
  FOOTBALL_SIDE_SIZES,
  footballPlayersAllowedBounds,
  isFootballSideSize,
} from "./game-shape";
import {
  gameRatingScopeLabel,
  groupHasTier,
  groupRatingScopeNote,
  ratedScopeForGroup,
  type GameRatingScope,
} from "./game-rating-scope";
import { DEFAULT_SPORT, type Sport } from "./sport";

export const CREATE_FLOW_STEP_COUNT = 4;

export type CreateFlowStep = 1 | 2 | 3 | 4;

export type CreateGameTypeId = "friendly_game" | "friendly_tournament";

export function createGameTypeCards(locale: Locale): readonly {
  id: CreateGameTypeId;
  title: string;
  description: string;
  rating: string;
}[] {
  const m = messagesFor(locale).createGame.typeCards;
  return [
    { id: "friendly_game", ...m.friendlyGame },
    { id: "friendly_tournament", ...m.friendlyTournament },
  ];
}

type CreateFlowLaterStep = {
  step: Exclude<CreateFlowStep, 1>;
  title: string;
};

export function createFlowLaterSteps(
  type: CreateGameTypeId | null,
  locale: Locale,
  sport: Sport = DEFAULT_SPORT,
): readonly CreateFlowLaterStep[] {
  const m = messagesFor(locale).createGame.steps;
  if (sport === "football") {
    return [
      { step: 2, title: m.where },
      { step: 3, title: m.when },
      { step: 4, title: m.sizeAndPrice },
    ];
  }
  if (type === "friendly_tournament") {
    return [
      { step: 2, title: m.whereAndSize },
      { step: 3, title: m.formatAndDay },
      { step: 4, title: m.entryAndReview },
    ];
  }
  return [
    { step: 2, title: m.where },
    { step: 3, title: m.when },
    { step: 4, title: m.levelAndPrice },
  ];
}

/** A football Group only offers a Friendly game, so the Type step is skipped. */
export function createFlowFirstStep(sport: Sport): CreateFlowStep {
  return sport === "football" ? 2 : 1;
}

export function createFlowSeatsLabel(
  sport: Sport,
  size: { sideSize: number; playersAllowed: number },
  locale: Locale,
) {
  return sport === "football"
    ? footballSizeLabel(size.sideSize, size.playersAllowed, locale)
    : messagesFor(locale).createGame.openSeats;
}

export const FOOTBALL_SIDE_SIZE_PRESETS = [5, 7, 11] as const;

export function footballSideSizeStep(sideSize: number, direction: 1 | -1) {
  const index = FOOTBALL_SIDE_SIZES.findIndex((size) => size === sideSize);
  return FOOTBALL_SIDE_SIZES[index + direction] ?? sideSize;
}

export function changeFootballSideSize<
  T extends { sideSize: number; playersAllowed: number },
>(draft: T, sideSize: number): T {
  if (!isFootballSideSize(sideSize)) {
    return draft;
  }
  const oldBounds = footballPlayersAllowedBounds(draft.sideSize);
  const bounds = footballPlayersAllowedBounds(sideSize);
  const playersAllowed =
    draft.playersAllowed === oldBounds.min
      ? bounds.min
      : Math.min(Math.max(draft.playersAllowed, bounds.min), bounds.max);
  return { ...draft, sideSize, playersAllowed };
}

export function changeFootballPlayersAllowed<
  T extends { sideSize: number; playersAllowed: number },
>(draft: T, playersAllowed: number): T {
  const bounds = footballPlayersAllowedBounds(draft.sideSize);
  return {
    ...draft,
    playersAllowed: Math.min(Math.max(playersAllowed, bounds.min), bounds.max),
  };
}

/** A court price split across `players`, rounded up so the cap covers it. */
/**
 * The Rating choice on create (ADR-0053, ADR-0066). A padel Game on a Group
 * rates, and a football Game on a tier Group moves Tier points; every other
 * Game skips the choice and stays Unrated.
 */
export function createRatingChoiceShown(args: {
  sport: Sport;
  hasGroup: boolean;
  groupVerified?: boolean;
}) {
  if (!args.hasGroup) {
    return false;
  }
  return args.sport === "football"
    ? groupHasTier({ sport: args.sport, verified: args.groupVerified ?? false })
    : true;
}

export type CreateRatingOption = {
  rated: boolean;
  label: string;
  description: string | null;
};

export function createRatingChoice(args: {
  groupVerified: boolean;
  rated: boolean;
  locale: Locale;
  sport?: Sport;
}): {
  title: string;
  scope: GameRatingScope;
  scopeLabel: string;
  note: string;
  options: readonly CreateRatingOption[];
} {
  const m = messagesFor(args.locale).you.ratingScope;
  const ratedScope = ratedScopeForGroup(args.groupVerified);
  const scope = args.rated ? ratedScope : "unrated";
  const notes: Record<GameRatingScope, string> = {
    temba: m.temba_note,
    group: groupRatingScopeNote(args.locale, args.sport),
    unrated: m.unrated_note,
  };
  return {
    title: m.title,
    scope,
    scopeLabel: gameRatingScopeLabel(scope, args.locale, args.sport),
    note: notes[scope],
    options: [
      {
        rated: true,
        label: m.rated,
        description: gameRatingScopeLabel(ratedScope, args.locale, args.sport),
      },
      { rated: false, label: m.unrated, description: null },
    ],
  };
}

export function splitCostAcrossPlayers(priceFils: number, players: number) {
  return Math.ceil(priceFils / Math.max(players, 1));
}

export const CREATE_FLOW_DURATIONS = [60, 90, 120] as const;

export const CREATE_FLOW_MATCH_MINUTE_CHIPS = [20, 30, 45] as const;

export const DEFAULT_MATCH_MINUTES = 45;

export type CreateTournamentShape =
  | "groups_only"
  | "groups_then_knockout"
  | "knockout_only";

export const DEFAULT_TOURNAMENT_SHAPE: CreateTournamentShape = "groups_only";

export function tournamentShapeOptions(locale: Locale): readonly {
  id: CreateTournamentShape;
  title: string;
  description: string;
}[] {
  const m = messagesFor(locale).createGame.shapes;
  return [
    { id: "groups_only", ...m.groupsOnly },
    { id: "knockout_only", ...m.knockoutOnly },
    { id: "groups_then_knockout", ...m.groupsThenKnockout },
  ];
}

export function parseCreateTournamentShape(
  value: unknown,
): CreateTournamentShape | null {
  return value === "groups_only" ||
    value === "groups_then_knockout" ||
    value === "knockout_only"
    ? value
    : null;
}

export function createShapeHasPools(shape: CreateTournamentShape) {
  return shape !== "knockout_only";
}

export type CreateFlowDuration = (typeof CREATE_FLOW_DURATIONS)[number];

export const VISIBLE_GROUP_CHIP_COUNT = 3;

export const VISIBLE_COURT_CHIP_COUNT = 3;

export const VISIBLE_START_SLOT_COUNT = 7;

export const CREATE_FLOW_FIELD_IDS: Record<string, string> = {
  groupId: "game-group",
  venueId: "game-venue",
  courtId: "game-court",
  courtIds: "game-court",
  pricePerPlayerFils: "game-price-per-player",
  levelMinTenths: "game-level-min",
  levelMaxTenths: "game-level-max",
  windowStart: "game-window-start",
  windowEnd: "game-window-finish",
  teamCount: "tournament-team-count",
  tournamentShape: "tournament-shape",
  poolCount: "tournament-pool-count",
  roundCount: "tournament-round-count",
  qualifiersPerPool: "tournament-qualifiers-per-pool",
  matchMinutes: "tournament-match-minutes",
  name: "tournament-name",
  customName: "game-custom-name",
  sideSize: "game-side-size",
  playersAllowed: "game-players-allowed",
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
  "tournamentShape",
  "poolCount",
  "roundCount",
  "qualifiersPerPool",
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
  locale: Locale,
): { ok: true } | CreateFlowFieldIssue {
  const m = messagesFor(locale).createGame.validation;
  if (!groupId) {
    return {
      ok: false,
      field: "groupId",
      message: m.pickGroup,
      elementId: CREATE_FLOW_FIELD_IDS.groupId ?? "game-group",
    };
  }
  if (!venueId) {
    return {
      ok: false,
      field: "venueId",
      message: m.pickVenue,
      elementId: CREATE_FLOW_FIELD_IDS.venueId ?? "game-venue",
    };
  }
  return { ok: true };
}

export function validateFriendlyGameWhen(
  day: string,
  startTime: string,
  finishTime: string,
  locale: Locale,
  now: Date = new Date(),
): { ok: true; windowStart: Date; windowEnd: Date } | CreateFlowFieldIssue {
  const m = messagesFor(locale).createGame.validation;
  if (!parseDateInputValue(day)) {
    return {
      ok: false,
      field: "windowStart",
      message: m.pickDay,
      elementId: "game-window-day",
    };
  }
  const slots = upcomingGameWindowTimeSlots(day, now);
  if (!startTime || !slots.includes(startTime)) {
    return {
      ok: false,
      field: "windowStart",
      message: m.pickStartTime,
      elementId: CREATE_FLOW_FIELD_IDS.windowStart ?? "game-window-start",
    };
  }
  if (!finishTime || !GAME_WINDOW_FINISH_SLOTS.includes(finishTime)) {
    return {
      ok: false,
      field: "windowEnd",
      message: m.pickFinishTime,
      elementId: CREATE_FLOW_FIELD_IDS.windowEnd ?? "game-window-finish",
    };
  }
  if (finishTime < startTime) {
    return {
      ok: false,
      field: "windowEnd",
      message: m.finishAfterStart,
      elementId: CREATE_FLOW_FIELD_IDS.windowEnd ?? "game-window-finish",
    };
  }
  const parsed = parseRequiredGameWindow(day, startTime, finishTime);
  if (!parsed) {
    return {
      ok: false,
      field: "windowEnd",
      message: m.pickFinishTime,
      elementId: CREATE_FLOW_FIELD_IDS.windowEnd ?? "game-window-finish",
    };
  }
  return { ok: true, ...parsed };
}

export function parseCreateMatchMinutes(
  value: string,
  locale: Locale,
): { ok: true; minutes: number } | { ok: false; message: string } {
  const message = messagesFor(locale).createGame.matchMinutes;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, message };
  }
  const minutes = Number(trimmed);
  if (minutes < 10 || minutes > 120 || minutes % 5 !== 0) {
    return { ok: false, message };
  }
  return { ok: true, minutes };
}

export function validateTournamentName(
  name: string,
  locale: Locale,
): { ok: true; name: string } | CreateFlowFieldIssue {
  const trimmed = name.trim();
  if (!trimmed) {
    return {
      ok: false,
      field: "name",
      message: messagesFor(locale).createGame.validation.nameTournament,
      elementId: "tournament-name",
    };
  }
  return { ok: true, name: trimmed };
}

// The step helpers below read only `.ok`, so the message's language is moot.
export function firstIncompleteFriendlyTournamentStep(
  draft: FriendlyGameDraft & { matchMinutes: string },
  now: Date = new Date(),
): 2 | 3 | 4 {
  if (!draft.groupId || !draft.venueId) {
    return 2;
  }
  if (
    !validateFriendlyGameWhen(
      draft.day,
      draft.startTime,
      draft.finishTime,
      DEFAULT_LOCALE,
      now,
    ).ok
  ) {
    return 3;
  }
  if (!parseCreateMatchMinutes(draft.matchMinutes, DEFAULT_LOCALE).ok) {
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
    !validateFriendlyGameWhen(
      draft.day,
      draft.startTime,
      draft.finishTime,
      DEFAULT_LOCALE,
      now,
    ).ok
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

export type CreateGameFlowTarget = {
  groupId: string | null;
  type: CreateGameTypeId | null;
  step: CreateFlowStep | null;
};

export function createGameFlowTarget(
  input: Partial<CreateGameFlowTarget>,
): CreateGameFlowTarget {
  return {
    groupId: input.groupId === "" ? null : (input.groupId ?? null),
    type: input.type ?? null,
    step: input.step ?? null,
  };
}

export function friendlyTournamentCreateTarget(
  groupId?: string | null,
): CreateGameFlowTarget {
  return createGameFlowTarget({ groupId, type: "friendly_tournament" });
}

export function createVenueCopy(
  picker: {
    locked: boolean;
    groupKind: "club" | "loose" | "none";
    venues: { archivedAt: Date | string | null }[];
  },
  locale: Locale,
  options?: { manyCourts?: boolean; sport?: Sport },
) {
  const m = messagesFor(locale).createGame.venue;
  const football = options?.sport === "football";
  const optional = options?.manyCourts
    ? m.courtsOptional
    : football
      ? m.pitchOptional
      : m.courtOptional;
  const skip = options?.manyCourts
    ? m.skipCourts
    : football
      ? m.skipPitch
      : m.skipCourt;
  if (picker.locked) {
    if (picker.venues[0]?.archivedAt) {
      return m.lockedArchived(skip);
    }
    return m.lockedLinked(optional);
  }
  return m.pick(optional);
}

export function venueCardMeta(
  courtCount: number,
  city: string,
  locale: Locale,
  sport: Sport = DEFAULT_SPORT,
) {
  const m = messagesFor(locale).createGame;
  const courts =
    sport === "football"
      ? courtCountLabel(courtCount, sport, locale)
      : m.court.venueCount(courtCount);
  return m.venue.cardMeta(courts, city);
}

export function venueMatchesQuery(
  venue: { name: string; city: string },
  query: string,
) {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return [venue.name, venue.city].some((part) =>
    part.toLowerCase().includes(needle),
  );
}

export function visibleCreateCourts<T extends { id: string }>(
  courts: readonly T[],
  recentCourtIds: readonly string[],
  selectedIds: readonly string[] = [],
  count = VISIBLE_COURT_CHIP_COUNT,
): T[] {
  const byId = new Map(courts.map((court) => [court.id, court]));
  const recent: T[] = [];
  for (const id of recentCourtIds) {
    const court = byId.get(id);
    if (!court || recent.some((item) => item.id === court.id)) {
      continue;
    }
    recent.push(court);
    if (recent.length === count) {
      break;
    }
  }
  const visible = recent.length > 0 ? [...recent] : courts.slice(0, count);
  for (const id of selectedIds) {
    if (!id || visible.some((court) => court.id === id)) {
      continue;
    }
    const selected = byId.get(id);
    if (selected) {
      visible.push(selected);
    }
  }
  return visible;
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
  return Array.from({ length: count }, (_, index) =>
    addProductDays(start, index),
  );
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
  const startMinutes = timeSlotMinutes(startTime);
  if (
    startMinutes == null ||
    !GAME_WINDOW_TIME_SLOTS.includes(startTime) ||
    minutes % GAME_WINDOW_TIME_STEP_MINUTES !== 0
  ) {
    return null;
  }
  const finish = timeSlotFromMinutes(startMinutes + minutes);
  return GAME_WINDOW_FINISH_SLOTS.includes(finish) ? finish : null;
}

export function matchingDurationPreset(
  startTime: string,
  finishTime: string,
): CreateFlowDuration | null {
  const startMinutes = timeSlotMinutes(startTime);
  const finishMinutes = timeSlotMinutes(finishTime);
  if (
    startMinutes == null ||
    finishMinutes == null ||
    !GAME_WINDOW_TIME_SLOTS.includes(startTime) ||
    !GAME_WINDOW_FINISH_SLOTS.includes(finishTime)
  ) {
    return null;
  }
  const minutes = finishMinutes - startMinutes;
  return CREATE_FLOW_DURATIONS.find((preset) => preset === minutes) ?? null;
}

export function friendlyGameKickoff(
  day: string,
  startTime: string,
  finishTime: string,
  locale: Locale,
): { time: string; trailer: string } | null {
  const parsed = parseRequiredGameWindow(day, startTime, finishTime);
  if (!parsed || parsed.windowEnd.getTime() < parsed.windowStart.getTime()) {
    return null;
  }
  const kickoff = formatHomeKickoff(parsed.windowStart, locale);
  return {
    time: kickoff.time,
    trailer: formatHeroKickoffTrailer(
      parsed.windowStart,
      parsed.windowEnd,
      locale,
    ),
  };
}

/** The date on one line and the place on the next, so neither needs a separator. */
export function friendlyGamePreviewLines(input: {
  day: string;
  groupName: string | null;
  venueName: string | null;
  courtName: string | null;
  locale: Locale;
}): string[] {
  const dayLabel = input.day ? formatDayLabel(input.day, input.locale) : null;
  const place = [input.venueName ?? input.groupName, input.courtName]
    .filter((part): part is string => Boolean(part))
    .join(messagesFor(input.locale).createGame.edit.listSeparator);
  return [dayLabel, place].filter((line): line is string => Boolean(line));
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

export function createFlowPriceChips(locale: Locale): readonly {
  label: string;
  value: string;
}[] {
  return [
    { label: messagesFor(locale).createGame.price.free, value: "0" },
    { label: "3.500", value: "3.50" },
    { label: "4.250", value: "4.25" },
    { label: "4.500", value: "4.50" },
    { label: "5.250", value: "5.25" },
    { label: "6.000", value: "6.00" },
    { label: "6.500", value: "6.50" },
    { label: "7.000", value: "7.00" },
    { label: "7.500", value: "7.50" },
  ];
}

export function priceChipIsSelected(chipValue: string, input: string) {
  // Only `.ok` and the fils are read here, so the message's language is moot.
  const chip = parseOptionalPricePerPlayerFils(chipValue, DEFAULT_LOCALE);
  const current = parseOptionalPricePerPlayerFils(input, DEFAULT_LOCALE);
  if (!chip.ok || !current.ok || chip.fils == null || current.fils == null) {
    return false;
  }
  return chip.fils === current.fils;
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

export function friendlyTournamentDayLabel(day: string, locale: Locale) {
  const date = parseDateInputValue(day);
  if (!date) {
    return null;
  }
  return formatDayMonth(date, locale, { weekday: "short" });
}

export function friendlyTournamentDefaultName(day: string, locale: Locale) {
  const m = messagesFor(locale).createGame.tournament;
  const label = friendlyTournamentDayLabel(day, locale);
  return label ? m.defaultName(label) : m.defaultNameNoDay;
}

export function friendlyTournamentGroupsLine(
  sizing: TournamentSizing,
  locale: Locale,
) {
  return formatPoolSizeLine(sizing, locale);
}

export function friendlyTournamentFormatLabel(
  poolCount: number,
  locale: Locale,
  thenKnockout = false,
) {
  const m = messagesFor(locale).createGame.tournament;
  const groups = m.groups(poolCount);
  return thenKnockout ? m.groupsThenKnockout(groups) : groups;
}

export function knockoutMatchCountLabel(matches: number, locale: Locale) {
  return messagesFor(locale).createGame.tournament.knockoutMatches(matches);
}

export function friendlyTournamentMatchCountLabel(
  poolMatches: number,
  locale: Locale,
) {
  return messagesFor(locale).createGame.tournament.groupMatches(poolMatches);
}

export function friendlyTournamentScheduleLine(
  poolMatches: number,
  clock: string,
  locale: Locale,
) {
  return messagesFor(locale).createGame.tournament.scheduleLine(
    friendlyTournamentMatchCountLabel(poolMatches, locale),
    clock,
  );
}

export function groupsThenKnockoutScheduleLine(
  poolMatches: number,
  knockoutMatches: number,
  clock: string,
  locale: Locale,
) {
  return messagesFor(locale).createGame.tournament.scheduleLineBoth(
    friendlyTournamentMatchCountLabel(poolMatches, locale),
    knockoutMatchCountLabel(knockoutMatches, locale),
    clock,
  );
}

export function friendlyTournamentSchedule(input: {
  start: Date;
  finish: Date;
  roundMatches: readonly number[];
  courtCount: number;
  matchMinutes: number;
  clock: (date: Date) => string;
  locale: Locale;
  knockoutOnly?: boolean;
  /** Groups then knockout: the Knockout rounds after the Pool Rounds. */
  knockoutRoundMatches?: readonly number[];
}): { line: string | null; overruns: boolean } {
  const knockoutRoundMatches = input.knockoutRoundMatches ?? [];
  const fit = oneDayFit({
    start: input.start,
    finish: input.finish,
    roundMatches: [...input.roundMatches, ...knockoutRoundMatches],
    courtCount: input.courtCount,
    matchMinutes: input.matchMinutes,
  });
  const sum = (counts: readonly number[]) =>
    counts.reduce((total, matches) => total + matches, 0);
  const matchCount = sum(input.roundMatches);
  const clock = fit.lastFinish ? input.clock(fit.lastFinish) : null;
  let line: string | null = null;
  if (clock != null) {
    if (input.knockoutOnly) {
      line = messagesFor(input.locale).createGame.tournament.scheduleLine(
        knockoutMatchCountLabel(matchCount, input.locale),
        clock,
      );
    } else if (knockoutRoundMatches.length > 0) {
      line = groupsThenKnockoutScheduleLine(
        matchCount,
        sum(knockoutRoundMatches),
        clock,
        input.locale,
      );
    } else {
      line = friendlyTournamentScheduleLine(matchCount, clock, input.locale);
    }
  }
  return { line, overruns: fit.overruns };
}

export function friendlyTournamentPreviewDetail(input: {
  day: string;
  venueName: string | null;
  courtNames: readonly string[];
  locale: Locale;
}) {
  const dayLabel = input.day
    ? friendlyTournamentDayLabel(input.day, input.locale)
    : null;
  const { common } = messagesFor(input.locale);
  const courts =
    input.courtNames.length > 0
      ? input.courtNames.map(common.isolate).join(common.listSeparator)
      : null;
  return [dayLabel, input.venueName, courts]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export function friendlyTournamentCourtsLabel(
  names: readonly string[],
  locale: Locale,
) {
  const { common } = messagesFor(locale);
  if (names.length === 0) {
    return common.none;
  }
  return names.map(common.isolate).join(common.listSeparator);
}

export function gameTeamOfTwoCopy(price: string, locale: Locale) {
  const m = messagesFor(locale).createGame.price;
  const parsed = parseOptionalPricePerPlayerFils(price, locale);
  if (!parsed.ok || parsed.fils == null) {
    return null;
  }
  const doubled = parsed.fils * 2;
  if (doubled === 0) {
    return m.teamOfTwo(m.amount("0.000"));
  }
  const formatted = formatPricePerPlayerFils(doubled, locale);
  if (!formatted) {
    return null;
  }
  return m.teamOfTwo(formatted);
}

export type CreateWindowTimes = { startTime: string; finishTime: string };

export function reconcileWindowForDay(
  current: CreateWindowTimes,
  day: string,
  now: Date,
  finishAtStart: "allowed" | "blocked",
): CreateWindowTimes {
  const slots = upcomingGameWindowTimeSlots(day, now);
  if (current.startTime && !slots.includes(current.startTime)) {
    return { startTime: "", finishTime: "" };
  }
  const finishTooEarly =
    finishAtStart === "allowed"
      ? current.finishTime < current.startTime
      : current.finishTime <= current.startTime;
  if (
    current.finishTime &&
    (!GAME_WINDOW_FINISH_SLOTS.includes(current.finishTime) ||
      (current.startTime && finishTooEarly))
  ) {
    return { startTime: current.startTime, finishTime: "" };
  }
  return current;
}

export function selectStartSlot(
  current: CreateWindowTimes,
  slot: string,
  keepDuration: boolean,
): CreateWindowTimes {
  const preset = keepDuration
    ? matchingDurationPreset(current.startTime, current.finishTime)
    : null;
  if (preset) {
    return {
      startTime: slot,
      finishTime: finishSlotForDuration(slot, preset) ?? "",
    };
  }
  return {
    startTime: slot,
    finishTime:
      current.finishTime && current.finishTime <= slot
        ? ""
        : current.finishTime,
  };
}

export function selectDurationFinish(
  startTime: string,
  minutes: number,
): string {
  return finishSlotForDuration(startTime, minutes) ?? "";
}

export function resetCreateBranch(
  draft: CreateGameDraft,
  type: CreateGameTypeId,
  locale: Locale,
): CreateGameDraft {
  if (type === "friendly_game") {
    return {
      ...draft,
      courtIds: [],
      teamCount: TOURNAMENT_DEFAULT_TEAM_COUNT,
      tournamentShape: DEFAULT_TOURNAMENT_SHAPE,
      poolCount: defaultPoolCount(TOURNAMENT_DEFAULT_TEAM_COUNT),
      roundCount: null,
      qualifiersPerPool: DEFAULT_QUALIFIERS_PER_POOL,
      matchMinutes: String(DEFAULT_MATCH_MINUTES),
      nameTouched: false,
      name: friendlyTournamentDefaultName(draft.day, locale),
      isPublic: false,
      allowSoloRegister: true,
    };
  }
  return { ...draft, courtId: "none", customName: "" };
}

export function changeCreateDay<
  T extends { day: string; name: string; nameTouched: boolean },
>(draft: T, day: string, locale: Locale): T {
  return {
    ...draft,
    day,
    name: draft.nameTouched
      ? draft.name
      : friendlyTournamentDefaultName(day, locale),
  };
}

export function changeCreateGroup(
  draft: CreateGameDraft,
  groupId: string,
): CreateGameDraft {
  return {
    ...draft,
    groupId,
    venueId: "",
    courtId: "none",
    courtIds: [],
    isPublic: false,
  };
}

export function changeCreateVenue(
  draft: CreateGameDraft,
  venueId: string,
): CreateGameDraft {
  if (venueId === draft.venueId) {
    return draft;
  }
  return { ...draft, venueId, courtId: "none", courtIds: [] };
}

export function toggleCreateCourt(
  courtIds: readonly string[],
  courtId: string,
): string[] {
  return courtIds.includes(courtId)
    ? courtIds.filter((id) => id !== courtId)
    : [...courtIds, courtId];
}

export function createDayChipLabel(
  option: Date,
  now: Date,
  locale: Locale,
): string {
  return dayChipValue(option) === formatDateInputValue(now)
    ? messagesFor(locale).common.today
    : formatWeekday(option, "short", locale);
}

export type CreateGroupOption = {
  id: string;
  name: string | null;
  venueName: string | null;
  sport?: string | null;
  verified: boolean;
};

export type CreateVenuePicker = {
  locked: boolean;
  groupKind: "club" | "loose" | "none";
  venues: {
    id: string;
    name: string;
    city: string;
    archivedAt: Date | string | null;
    courts: { id: string; name: string }[];
  }[];
  recentCourtIds: readonly string[];
};
