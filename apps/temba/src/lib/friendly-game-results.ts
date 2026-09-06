export const FRIENDLY_SET_GAMES_MIN = 0;
export const FRIENDLY_SET_GAMES_MAX = 7;

export function clampFriendlySetGames(value: number) {
  return Math.min(
    FRIENDLY_SET_GAMES_MAX,
    Math.max(FRIENDLY_SET_GAMES_MIN, value),
  );
}

export function stepFriendlySetGames(current: number | null, delta: -1 | 1) {
  return clampFriendlySetGames((current ?? 0) + delta);
}

export function friendlySetGamesDisplay(value: number | null) {
  return value == null ? "—" : String(value);
}

export function friendlyGameResultsIsPending(
  sets: { slot1GamesWon: number | null; slot2GamesWon: number | null }[],
) {
  return sets.every(
    (set) => set.slot1GamesWon == null && set.slot2GamesWon == null,
  );
}

export function friendlyGameResultsSetWinsDisplay(
  pending: boolean,
  slot1SetWins: number,
  slot2SetWins: number,
) {
  if (pending) {
    return { slot1: "—", slot2: "—" };
  }
  return { slot1: String(slot1SetWins), slot2: String(slot2SetWins) };
}

export function friendlyGameResultsCanEnterSets(input: {
  gameCancelled: boolean;
  matchStatus: string | null;
  canScoreSets: boolean;
}) {
  if (
    input.gameCancelled ||
    input.matchStatus === "cancelled" ||
    input.matchStatus === "completed"
  ) {
    return false;
  }
  return input.canScoreSets;
}

export function friendlyGameResultsSaveSets(
  sets: { id: string; slot1: number | null; slot2: number | null }[],
) {
  return sets.flatMap((set) =>
    set.slot1 == null || set.slot2 == null
      ? []
      : [
          {
            setId: set.id,
            slot1GamesWon: set.slot1,
            slot2GamesWon: set.slot2,
          },
        ],
  );
}

export function friendlyGameResultsWinnerLine(input: {
  matchStatus: string | null;
  outcomeResult: string;
  slot1Label: string;
  slot2Label: string;
}) {
  if (input.matchStatus === "cancelled") {
    return "Match cancelled";
  }
  if (input.matchStatus === "completed") {
    if (input.outcomeResult === "draw") {
      return "Match draw";
    }
    if (input.outcomeResult === "slot1") {
      return `${input.slot1Label} won`;
    }
    if (input.outcomeResult === "slot2") {
      return `${input.slot2Label} won`;
    }
    return "Match completed";
  }
  if (input.outcomeResult === "none") {
    return "Needs a score";
  }
  return null;
}
