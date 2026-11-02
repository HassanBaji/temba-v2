/**
 * The Edit game sheet (design "Edit game flow"): one form, one Save. The
 * draft is compared with what the Game holds, and the sections that differ
 * become an ordered list of save steps the client sends one by one, each a
 * door the API already has.
 */

import { gameLevelRangeSaveInput, gameWindowSaveInput } from "./game-edit-save";
import { gameCustomName, normalizeGameCustomName } from "./game-custom-name";
import { gameSeasonFix } from "./game-season-link";
import {
  FOOTBALL_SIDE_SIZES,
  footballPlayersAllowedBounds,
  sideSizeLabel,
  type FootballSideSize,
} from "./game-shape";
import { parseGameDateTime, splitGameWindow } from "./game-window";
import type { GroupSeasonData } from "./group-season";
import {
  parseLevelBandSelectTenths,
  tenthsToLevelBandSelectValue,
  type LevelBandSelectValue,
} from "./level-range";
import {
  filsToMajorInput,
  parseOptionalPricePerPlayerFils,
} from "./price-per-player";

export const EDIT_GAME_TITLE = "Edit game";
export const SAVE_CHANGES_ACTION = "Save changes";
export const CHANGES_LABEL = "Changes";
export const NO_CHANGES_NOTE = "None yet";
export const CHANGES_SAVED_TOAST = "Changes saved";
export const OPTIONAL_TAG = "Optional";
export const NAME_SECTION_HINT =
  "Shown on the game and at the top of the invite. Empty uses the day and time.";
export const WHEN_SECTION_HINT =
  "Today or later, 30-minute steps. For today only upcoming times are listed.";
export const PLAYERS_AND_PRICE_HINT =
  "Dropping players below the number joined moves the latest joiners to the waiting list. They get a spot back if someone leaves. Price changes apply to players who join from now on.";
export const EVERYONE_KEEPS_SPOT_NOTE = "Everyone who joined keeps their spot.";

/** `"Karbabad Turf, Pitch 2. Venue can't change."` */
export function venueLockedLine(
  venueName: string | null,
  courtName: string | null,
) {
  const place = [venueName, courtName].filter(Boolean).join(", ");
  return place ? `${place}. Venue can't change.` : "Venue can't change.";
}

export type GameEditDraft = {
  customName: string;
  day: string;
  startTime: string;
  finishTime: string;
  /** Major units as typed, `"2.000"`. */
  price: string;
  playersAllowed: number | null;
  sideSize: number | null;
  levelMin: LevelBandSelectValue;
  levelMax: LevelBandSelectValue;
  roundCount: number | null;
  seasonId: string | null;
};

export type GameEditSource = {
  name: string | null;
  hasCustomName?: boolean | null;
  windowStart: Date | string | null;
  windowEnd: Date | string | null;
  pricePerPlayerFils: number | null;
  playersAllowed: number | null;
  sideSize: number | null;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  roundCount: number | null;
  seasonId: string | null;
};

export function gameEditDraftFrom(game: GameEditSource): GameEditDraft {
  const window = splitGameWindow(game.windowStart, game.windowEnd);
  return {
    customName: gameCustomName(game) ?? "",
    day: window.day,
    startTime: window.startTime,
    finishTime: window.finishTime,
    price: filsToMajorInput(game.pricePerPlayerFils),
    playersAllowed: game.playersAllowed,
    sideSize: game.sideSize,
    levelMin: tenthsToLevelBandSelectValue(game.levelMinTenths),
    levelMax: tenthsToLevelBandSelectValue(game.levelMaxTenths),
    roundCount: game.roundCount,
    seasonId: game.seasonId,
  };
}

export const GAME_EDIT_SECTION_KEYS = [
  "name",
  "window",
  "caps",
  "price",
  "level",
  "rounds",
  "season",
] as const;

export type GameEditSectionKey = (typeof GAME_EDIT_SECTION_KEYS)[number];

/** Which sections the sheet shows for this Game. */
export type GameEditSections = Record<GameEditSectionKey, boolean>;

export function gameEditSectionsFor(game: {
  format: string;
  sport?: string | null;
  groupId: string | null;
  tournamentRounds: boolean;
}): GameEditSections {
  const friendly = game.format === "friendly_game";
  const football = game.sport === "football";
  return {
    name: friendly,
    window: true,
    caps: friendly && football,
    price: true,
    level: !football,
    rounds: game.tournamentRounds,
    season: game.groupId != null,
  };
}

export type GameEditStep =
  | { kind: "name"; customName: string | null }
  | {
      kind: "window";
      name: string;
      windowStart: Date;
      windowEnd: Date;
      seasonId?: string | null;
    }
  | { kind: "caps"; playersAllowed?: number; sideSize?: number }
  | { kind: "price"; pricePerPlayerFils: number | null }
  | {
      kind: "level";
      levelMinTenths: number | null;
      levelMaxTenths: number | null;
    }
  | { kind: "rounds"; roundCount: number | null }
  | { kind: "season"; seasonId: string | null };

export type GameEditPlan =
  | { ok: true; steps: GameEditStep[]; changed: GameEditSectionKey[] }
  | { ok: false; field: "window" | "price" | "level"; message: string };

export const WINDOW_INCOMPLETE_MESSAGE =
  "Pick a day, a start time and a finish time";

function sameLevel(saved: GameEditDraft, draft: GameEditDraft) {
  return (
    parseLevelBandSelectTenths(saved.levelMin, "min") ===
      parseLevelBandSelectTenths(draft.levelMin, "min") &&
    parseLevelBandSelectTenths(saved.levelMax, "max") ===
      parseLevelBandSelectTenths(draft.levelMax, "max")
  );
}

export function gameEditChangedSections(
  saved: GameEditDraft,
  draft: GameEditDraft,
  sections: GameEditSections,
): GameEditSectionKey[] {
  const changed: GameEditSectionKey[] = [];
  if (
    sections.name &&
    normalizeGameCustomName(saved.customName) !==
      normalizeGameCustomName(draft.customName)
  ) {
    changed.push("name");
  }
  if (
    sections.window &&
    (saved.day !== draft.day ||
      saved.startTime !== draft.startTime ||
      saved.finishTime !== draft.finishTime)
  ) {
    changed.push("window");
  }
  if (
    sections.caps &&
    (saved.playersAllowed !== draft.playersAllowed ||
      saved.sideSize !== draft.sideSize)
  ) {
    changed.push("caps");
  }
  if (sections.price) {
    const before = parseOptionalPricePerPlayerFils(saved.price);
    const after = parseOptionalPricePerPlayerFils(draft.price);
    if (!after.ok || !before.ok || before.fils !== after.fils) {
      changed.push("price");
    }
  }
  if (sections.level && !sameLevel(saved, draft)) {
    changed.push("level");
  }
  if (sections.rounds && saved.roundCount !== draft.roundCount) {
    changed.push("rounds");
  }
  if (sections.season && saved.seasonId !== draft.seasonId) {
    changed.push("season");
  }
  return changed;
}

/**
 * The save steps in the order the API wants them: the window carries a
 * season change so the server checks the link against the new day.
 */
export function gameEditPlan(
  saved: GameEditDraft,
  draft: GameEditDraft,
  sections: GameEditSections,
): GameEditPlan {
  const changed = gameEditChangedSections(saved, draft, sections);
  const steps: GameEditStep[] = [];
  const has = (key: GameEditSectionKey) => changed.includes(key);

  if (has("name")) {
    steps.push({
      kind: "name",
      customName: normalizeGameCustomName(draft.customName),
    });
  }
  if (has("window")) {
    const input = gameWindowSaveInput(
      draft.day,
      draft.startTime,
      draft.finishTime,
    );
    if (!input) {
      return { ok: false, field: "window", message: WINDOW_INCOMPLETE_MESSAGE };
    }
    steps.push({
      kind: "window",
      ...input,
      ...(has("season") ? { seasonId: draft.seasonId } : {}),
    });
  }
  if (has("caps")) {
    steps.push({
      kind: "caps",
      ...(draft.playersAllowed != null &&
      draft.playersAllowed !== saved.playersAllowed
        ? { playersAllowed: draft.playersAllowed }
        : {}),
      ...(draft.sideSize != null && draft.sideSize !== saved.sideSize
        ? { sideSize: draft.sideSize }
        : {}),
    });
  }
  if (has("price")) {
    const parsed = parseOptionalPricePerPlayerFils(draft.price);
    if (!parsed.ok) {
      return { ok: false, field: "price", message: parsed.message };
    }
    steps.push({ kind: "price", pricePerPlayerFils: parsed.fils });
  }
  if (has("level")) {
    const result = gameLevelRangeSaveInput(draft.levelMin, draft.levelMax);
    if (!result.ok) {
      return { ok: false, field: "level", message: result.message };
    }
    steps.push({ kind: "level", ...result.input });
  }
  if (has("rounds")) {
    steps.push({ kind: "rounds", roundCount: draft.roundCount });
  }
  if (has("season") && !has("window")) {
    steps.push({ kind: "season", seasonId: draft.seasonId });
  }
  return { ok: true, steps, changed };
}

function changePhrase(
  key: GameEditSectionKey,
  saved: GameEditDraft,
  draft: GameEditDraft,
): string[] {
  switch (key) {
    case "name":
      return ["name"];
    case "window":
      return [saved.day !== draft.day ? "day moved" : "time changed"];
    case "caps": {
      const phrases: string[] = [];
      if (saved.playersAllowed !== draft.playersAllowed) {
        phrases.push("players");
      }
      if (saved.sideSize !== draft.sideSize) {
        phrases.push("a-side");
      }
      return phrases;
    }
    case "price":
      return ["price"];
    case "level":
      return ["level range"];
    case "rounds":
      return ["rounds"];
    case "season":
      return [
        draft.seasonId === null
          ? "season unlinked"
          : saved.seasonId === null
            ? "season linked"
            : "season changed",
      ];
  }
}

/**
 * The line beside Save (design 1a, 1c, 1d): `"None yet"`, `"Season linked"`,
 * `"Day moved. Season needs a fix."`.
 */
export function gameEditChangeNote(
  saved: GameEditDraft,
  draft: GameEditDraft,
  sections: GameEditSections,
  options: { seasonNeedsFix?: boolean } = {},
) {
  const phrases = gameEditChangedSections(saved, draft, sections).flatMap(
    (key) => changePhrase(key, saved, draft),
  );
  const list = phrases.join(", ");
  const sentence = list.charAt(0).toUpperCase() + list.slice(1);
  if (options.seasonNeedsFix) {
    return sentence
      ? `${sentence}. Season needs a fix.`
      : "Season needs a fix.";
  }
  return sentence || NO_CHANGES_NOTE;
}

/** The fix the Season section asks for once the day leaves the linked Season. */
export function gameEditSeasonFix(
  draft: Pick<GameEditDraft, "day" | "seasonId">,
  seasons: readonly GroupSeasonData[],
  now: Date,
) {
  if (!draft.day) {
    return null;
  }
  const linked = seasons.find((season) => season.id === draft.seasonId) ?? null;
  return gameSeasonFix(linked, seasons, draft.day, now);
}

/** `"90 min"` from the draft's times, or `null` while they are incomplete. */
export function windowDurationLabel(
  day: string,
  startTime: string,
  finishTime: string,
): string | null {
  const start = parseGameDateTime(day || "2000-01-01", startTime);
  const end = parseGameDateTime(day || "2000-01-01", finishTime);
  if (!start || !end) {
    return null;
  }
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  return minutes > 0 ? `${minutes} min` : null;
}

export function joinedCountLabel(count: number) {
  return `${count} joined`;
}

/** `"6-a-side, 12 on the pitch, 2 subs"` */
export function footballFormatNote(sideSize: number, playersAllowed: number) {
  const onPitch = sideSize * 2;
  const subs = playersAllowed - onPitch;
  const base = `${sideSizeLabel(sideSize)}, ${onPitch} on the pitch`;
  if (subs <= 0) {
    return base;
  }
  return `${base}, ${subs} ${subs === 1 ? "sub" : "subs"}`;
}

/** `"3 of the 9 joined move to the waiting list, latest to join first."` */
export function playersCapWaitNote(playersAllowed: number, joined: number) {
  if (playersAllowed >= joined) {
    return EVERYONE_KEEPS_SPOT_NOTE;
  }
  return `${joined - playersAllowed} of the ${joined} joined move to the waiting list, latest to join first.`;
}

export function asideLabel(sideSize: number) {
  return `${sideSize}v${sideSize}`;
}

export function footballSideSizeStep(
  sideSize: number,
  direction: 1 | -1,
): FootballSideSize | null {
  const index = FOOTBALL_SIDE_SIZES.indexOf(sideSize as FootballSideSize);
  if (index === -1) {
    return null;
  }
  return FOOTBALL_SIDE_SIZES[index + direction] ?? null;
}

/** Players allowed never drops under two full sides when the side grows. */
export function playersAllowedForSideSize(
  playersAllowed: number | null,
  sideSize: number,
) {
  const bounds = footballPlayersAllowedBounds(sideSize);
  return Math.min(
    Math.max(playersAllowed ?? bounds.min, bounds.min),
    bounds.max,
  );
}
