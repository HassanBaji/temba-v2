import {
  DEFAULT_MATCH_MINUTES,
  DEFAULT_TOURNAMENT_SHAPE,
  earliestCreateDay,
  friendlyTournamentDefaultName,
  parseCreateTournamentShape,
  type CreateGameTypeId,
  type CreateTournamentShape,
} from "~/lib/create-game-flow";
import { parseDateInputValue } from "~/lib/game-window";
import { isAssignableDisplayLevelBand, LEVEL_BANDS } from "~/lib/level-bands";
import {
  LEVEL_BAND_SELECT_NONE,
  type LevelBandSelectValue,
} from "~/lib/level-range";
import {
  defaultPoolCount,
  TOURNAMENT_DEFAULT_TEAM_COUNT,
} from "~/lib/tournament-sizing";

export type CreateGameDraft = {
  groupId: string;
  venueId: string;
  courtId: string;
  courtIds: string[];
  day: string;
  startTime: string;
  finishTime: string;
  pricePerPlayer: string;
  levelMin: LevelBandSelectValue;
  levelMax: LevelBandSelectValue;
  preferLevelRange: boolean;
  teamCount: number;
  tournamentShape: CreateTournamentShape;
  poolCount: number;
  roundCount: number | null;
  matchMinutes: string;
  name: string;
  nameTouched: boolean;
  isPublic: boolean;
  allowSoloRegister: boolean;
};

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const DRAFT_VERSION = 1;

const CREATE_GAME_TYPES: readonly CreateGameTypeId[] = [
  "friendly_game",
  "friendly_tournament",
];

export function initialCreateGameDraft(now: Date): CreateGameDraft {
  const day = earliestCreateDay(now);
  return {
    groupId: "",
    venueId: "",
    courtId: "none",
    courtIds: [],
    day,
    startTime: "",
    finishTime: "",
    pricePerPlayer: "",
    levelMin: LEVEL_BAND_SELECT_NONE,
    levelMax: LEVEL_BAND_SELECT_NONE,
    preferLevelRange: false,
    teamCount: TOURNAMENT_DEFAULT_TEAM_COUNT,
    tournamentShape: DEFAULT_TOURNAMENT_SHAPE,
    poolCount: defaultPoolCount(TOURNAMENT_DEFAULT_TEAM_COUNT),
    roundCount: null,
    matchMinutes: String(DEFAULT_MATCH_MINUTES),
    name: friendlyTournamentDefaultName(day),
    nameTouched: false,
    isPublic: false,
    allowSoloRegister: true,
  };
}

export function createGameDraftStorageKey(type: CreateGameTypeId) {
  return `temba:create-game-draft:${type}`;
}

export function serializeCreateGameDraft(draft: CreateGameDraft) {
  return JSON.stringify({
    version: DRAFT_VERSION,
    groupId: draft.groupId,
    venueId: draft.venueId,
    courtId: draft.courtId,
    courtIds: draft.courtIds,
    day: draft.day,
    startTime: draft.startTime,
    finishTime: draft.finishTime,
    pricePerPlayer: draft.pricePerPlayer,
    levelMin: draft.levelMin,
    levelMax: draft.levelMax,
    preferLevelRange: draft.preferLevelRange,
    teamCount: draft.teamCount,
    tournamentShape: draft.tournamentShape,
    poolCount: draft.poolCount,
    roundCount: draft.roundCount,
    matchMinutes: draft.matchMinutes,
    name: draft.name,
    nameTouched: draft.nameTouched,
    isPublic: draft.isPublic,
    allowSoloRegister: draft.allowSoloRegister,
  });
}

function isLevelBandSelectValue(value: unknown): value is LevelBandSelectValue {
  return (
    typeof value === "string" &&
    (value === LEVEL_BAND_SELECT_NONE ||
      LEVEL_BANDS.some((band) => band === value) ||
      isAssignableDisplayLevelBand(value))
  );
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function parseCreateGameDraft(
  raw: string | null,
): CreateGameDraft | null {
  if (!raw) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const tournamentShape =
    record.tournamentShape === undefined
      ? DEFAULT_TOURNAMENT_SHAPE
      : parseCreateTournamentShape(record.tournamentShape);
  const strings = [
    "groupId",
    "venueId",
    "courtId",
    "day",
    "startTime",
    "finishTime",
    "pricePerPlayer",
    "matchMinutes",
    "name",
  ] as const;
  const booleans = [
    "preferLevelRange",
    "nameTouched",
    "isPublic",
    "allowSoloRegister",
  ] as const;
  if (
    record.version !== DRAFT_VERSION ||
    strings.some((key) => typeof record[key] !== "string") ||
    booleans.some((key) => typeof record[key] !== "boolean") ||
    !Array.isArray(record.courtIds) ||
    !record.courtIds.every((id) => typeof id === "string") ||
    !isLevelBandSelectValue(record.levelMin) ||
    !isLevelBandSelectValue(record.levelMax) ||
    !isCount(record.teamCount) ||
    tournamentShape == null ||
    !isCount(record.poolCount) ||
    !(record.roundCount === null || isCount(record.roundCount)) ||
    parseDateInputValue(record.day as string) === undefined
  ) {
    return null;
  }
  return {
    groupId: record.groupId as string,
    venueId: record.venueId as string,
    courtId: record.courtId as string,
    courtIds: record.courtIds,
    day: record.day as string,
    startTime: record.startTime as string,
    finishTime: record.finishTime as string,
    pricePerPlayer: record.pricePerPlayer as string,
    levelMin: record.levelMin,
    levelMax: record.levelMax,
    preferLevelRange: record.preferLevelRange as boolean,
    teamCount: record.teamCount,
    tournamentShape,
    poolCount: record.poolCount,
    roundCount: record.roundCount,
    matchMinutes: record.matchMinutes as string,
    name: record.name as string,
    nameTouched: record.nameTouched as boolean,
    isPublic: record.isPublic as boolean,
    allowSoloRegister: record.allowSoloRegister as boolean,
  };
}

export function isCreateGameDraftDirty(
  draft: CreateGameDraft,
  initial: CreateGameDraft,
) {
  return serializeCreateGameDraft(draft) !== serializeCreateGameDraft(initial);
}

/** Private mode or blocked site data can make even reading the property throw. */
export function browserSessionStorage(): DraftStorage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readCreateGameDraft(
  storage: DraftStorage | null,
  type: CreateGameTypeId,
): CreateGameDraft | null {
  try {
    return parseCreateGameDraft(
      storage?.getItem(createGameDraftStorageKey(type)) ?? null,
    );
  } catch {
    return null;
  }
}

export function writeCreateGameDraft(
  storage: DraftStorage | null,
  type: CreateGameTypeId,
  serialized: string | null,
) {
  try {
    if (serialized === null) {
      storage?.removeItem(createGameDraftStorageKey(type));
      return;
    }
    storage?.setItem(createGameDraftStorageKey(type), serialized);
  } catch {
    return;
  }
}

export function clearCreateGameDrafts(storage: DraftStorage | null) {
  for (const type of CREATE_GAME_TYPES) {
    writeCreateGameDraft(storage, type, null);
  }
}
