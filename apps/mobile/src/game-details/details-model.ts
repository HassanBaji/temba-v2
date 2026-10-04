import { friendlyGameFooterActions } from "@repo/domain/friendly-game-actions";
import type { FriendlyGameJoinSeat } from "@repo/domain/friendly-game-cta";
import { friendlyGameResultsSaveSets } from "@repo/domain/friendly-game-results";
import { defaultJoinSeat } from "@repo/domain/preferred-seat";
import { gameDetailsChrome } from "@repo/domain/tournament-home";

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

export const UNSUPPORTED_FORMAT_COPY = {
  title: "Not on mobile yet",
  description:
    "This kind of Game opens on the web for now. Friendly tournaments come to the app next.",
} as const;

export function gameTitle(name: string | null) {
  return name ?? "Game";
}

export type SeatSelection = {
  touched: boolean;
  seat: FriendlyGameJoinSeat | null;
};

export const UNTOUCHED_SELECTION: SeatSelection = {
  touched: false,
  seat: null,
};

export function pickedSeat(
  selection: SeatSelection,
  sides: Parameters<typeof defaultJoinSeat>[0],
  preferredPosition: string | null | undefined,
) {
  return selection.touched
    ? selection.seat
    : defaultJoinSeat(sides, preferredPosition);
}

export function togglePickedSeat(
  picked: FriendlyGameJoinSeat | null,
  seat: FriendlyGameJoinSeat,
): SeatSelection {
  const same =
    picked?.sideIndex === seat.sideIndex && picked.position === seat.position;
  return { touched: true, seat: same ? null : seat };
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

export function playerFooterActions(input: {
  phase: "upcoming" | "ongoing" | "needs_results" | "final";
  canLeaveGame: boolean;
  playerCount: number;
}) {
  return friendlyGameFooterActions({
    ...input,
    isOrganizer: false,
    canReportWrongScore: null,
  });
}
