import { friendlyGameResultsSaveSets } from "@repo/domain/friendly-game-results";
import {
  gameDisplayName,
  type GameDisplayNameInput,
} from "@repo/domain/game-custom-name";
import {
  defaultJoinSide,
  defaultJoinTeam,
  joinSideFor,
  teamVacancy,
  type CourtSide,
  type SideChoice,
  type SidesTeam,
} from "@repo/domain/padel-sides";
import { gameDetailsChrome } from "@repo/domain/tournament-home";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export function isFriendlyGameDetails(game: {
  format: string;
  poolCount: number | null;
  tournamentShape: string | null;
  registrationMode: string;
}) {
  return (
    gameDetailsChrome(
      game.format,
      game.poolCount,
      game.tournamentShape,
      game.registrationMode,
    ) === "friendly_game"
  );
}

export function unsupportedFormatCopy(locale: Locale) {
  return messagesFor(locale).mobileGameDetails.unsupported;
}

export function gameTitle(game: GameDisplayNameInput, locale: Locale) {
  return gameDisplayName(game, locale);
}

/** What the join sheet's Team and Side pickers hold until the viewer taps. */
export type JoinSelection = { team: number | null; side: SideChoice | null };

export const EMPTY_JOIN_SELECTION: JoinSelection = { team: null, side: null };

export type JoinPick = { sideIndex: number; position: SideChoice };

function freeSide(team: SidesTeam): CourtSide {
  return team.left == null ? "left" : "right";
}

/**
 * The seat the join sheet would submit. Untouched pickers fall back to the
 * team with a partner on it and the viewer's usual side. A side the partner
 * picked falls back to Either; on a tournament, which has no Either, to the
 * free side.
 */
export function resolveJoinPick(
  selection: JoinSelection,
  teams: readonly SidesTeam[],
  preferredPosition: string | null | undefined,
  sidesOptional: boolean,
): JoinPick | null {
  const open = teams.filter((team) => teamVacancy(team) > 0);
  const sideIndex =
    selection.team != null &&
    open.some((team) => team.sideIndex === selection.team)
      ? selection.team
      : defaultJoinTeam(open);
  const team = open.find((row) => row.sideIndex === sideIndex) ?? null;
  if (!team) {
    return null;
  }
  const side = selection.side
    ? joinSideFor(team, selection.side)
    : defaultJoinSide(team, preferredPosition);
  if (!sidesOptional && (side === "either" || team[side] != null)) {
    return { sideIndex: team.sideIndex, position: freeSide(team) };
  }
  return { sideIndex: team.sideIndex, position: side };
}

export type ScoreDrafts = Record<string, { slot1: string; slot2: string }>;

type DraftSet = {
  id: string;
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
};

function gamesText(value: number | null) {
  return value == null ? "" : String(value);
}

export function draftsFromSets(sets: readonly DraftSet[]): ScoreDrafts {
  const drafts: ScoreDrafts = {};
  for (const set of sets) {
    drafts[set.id] = {
      slot1: gamesText(set.slot1GamesWon),
      slot2: gamesText(set.slot2GamesWon),
    };
  }
  return drafts;
}

export function digitsOnly(text: string) {
  return text.replace(/\D/g, "");
}

function gamesFromText(text: string | undefined) {
  if (text == null || text === "") {
    return null;
  }
  return Number(text);
}

export function setsToSave(sets: readonly DraftSet[], drafts: ScoreDrafts) {
  return friendlyGameResultsSaveSets(
    sets.map((set) => ({
      id: set.id,
      slot1: gamesFromText(drafts[set.id]?.slot1) ?? set.slot1GamesWon,
      slot2: gamesFromText(drafts[set.id]?.slot2) ?? set.slot2GamesWon,
    })),
  );
}

export function withDraftChange(
  drafts: ScoreDrafts,
  set: DraftSet,
  sideIndex: number,
  text: string,
): ScoreDrafts {
  const current = drafts[set.id] ?? {
    slot1: gamesText(set.slot1GamesWon),
    slot2: gamesText(set.slot2GamesWon),
  };
  const value = digitsOnly(text);
  return {
    ...drafts,
    [set.id]: {
      slot1: sideIndex === 1 ? value : current.slot1,
      slot2: sideIndex === 2 ? value : current.slot2,
    },
  };
}
