import {
  isSameJoinPick,
  type FriendlyGameJoinPick,
} from "@repo/domain/friendly-game-cta";
import { friendlyGameResultsSaveSets } from "@repo/domain/friendly-game-results";
import {
  gameDisplayName,
  type GameDisplayNameInput,
} from "@repo/domain/game-custom-name";
import { defaultFriendlyJoinPick } from "@repo/domain/preferred-seat";
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

export type SeatSelection = {
  touched: boolean;
  seat: FriendlyGameJoinPick | null;
};

export const UNTOUCHED_SELECTION: SeatSelection = {
  touched: false,
  seat: null,
};

export function pickedSeat(
  selection: SeatSelection,
  sides: Parameters<typeof defaultFriendlyJoinPick>[0],
  preferredPosition: string | null | undefined,
) {
  return selection.touched
    ? selection.seat
    : defaultFriendlyJoinPick(sides, preferredPosition);
}

export function togglePickedSeat(
  picked: FriendlyGameJoinPick | null,
  seat: FriendlyGameJoinPick,
): SeatSelection {
  return { touched: true, seat: isSameJoinPick(picked, seat) ? null : seat };
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
