export type FriendlyScorePhase =
  | "upcoming"
  | "ongoing"
  | "needs_results"
  | "final";

export type FriendlyScoreSide = {
  sideIndex: number;
  gameTeamId: string | null;
  left: { userId: string; name: string } | null;
  right: { userId: string; name: string } | null;
};

export type FriendlyScoreSet = {
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
};

export type SetBoxState =
  | "locked"
  | "unplayed"
  | "enterable"
  | "readonly"
  | "solid"
  | "outline";

export const SCORE_INCOMPLETE_MESSAGE = "Enter games won for both teams";

export function scorePhaseFlags(phase: FriendlyScorePhase) {
  return {
    isUpcoming: phase === "upcoming" || phase === "ongoing",
    isFinal: phase === "final",
  };
}

export function scoreCanEnter(
  phase: FriendlyScorePhase,
  matchCanScoreSets: boolean,
) {
  return phase === "needs_results" && matchCanScoreSets;
}

export function scoreNameByUserId(sides: readonly FriendlyScoreSide[]) {
  const map = new Map<string, string>();
  for (const side of sides) {
    if (side.left) {
      map.set(side.left.userId, side.left.name);
    }
    if (side.right) {
      map.set(side.right.userId, side.right.name);
    }
  }
  return map;
}

export function scoreTeamNamesLabel(side: FriendlyScoreSide) {
  return `${side.left?.name ?? "Open"} & ${side.right?.name ?? "Open"}`;
}

/**
 * Side 1 always backs Match slot 1 and side 2 slot 2, even before either
 * side's Game team exists yet.
 */
export function scoreGamesWonForSide(set: FriendlyScoreSet, sideIndex: number) {
  return sideIndex === 1 ? set.slot1GamesWon : set.slot2GamesWon;
}

export function scoreSetNeverPlayed(set: FriendlyScoreSet) {
  return set.slot1GamesWon == null && set.slot2GamesWon == null;
}

export function scoreSetBoxState(input: {
  phase: FriendlyScorePhase;
  neverPlayed: boolean;
  canEnter: boolean;
  isWinningSide: boolean;
}): SetBoxState {
  const { isUpcoming, isFinal } = scorePhaseFlags(input.phase);
  if (isUpcoming) {
    return "locked";
  }
  if (isFinal) {
    if (input.neverPlayed) {
      return "unplayed";
    }
    return input.isWinningSide ? "solid" : "outline";
  }
  return input.canEnter ? "enterable" : "readonly";
}

export function scoreSetBoxAccessibleLabel(
  state: SetBoxState,
  label: string,
  value: number | null,
) {
  if (state === "solid") {
    return `${label}: ${value} games, won this Set`;
  }
  if (state === "outline") {
    return `${label}: ${value} games, lost this Set`;
  }
  if (state === "readonly") {
    return `${label}: ${value ?? "not entered yet"}`;
  }
  return label;
}

export function scoreFooterNote(
  phase: FriendlyScorePhase,
  confirmedAtLabel: string | null,
) {
  if (phase === "final") {
    return confirmedAtLabel
      ? `Confirmed by all four players on ${confirmedAtLabel}. Nothing else needed.`
      : "Confirmed by all four players. Nothing else needed.";
  }
  if (phase === "needs_results") {
    return "No score yet. Anyone who played can add it. The other three confirm before it counts towards your level.";
  }
  return "Scoring opens when the court is full. Fill the last spot and you'll be able to enter a result after the game.";
}

export type ScoreConfirmation = {
  confirmedUserIds: string[];
  requiredUserIds: string[];
  viewerHasConfirmed: boolean;
};

export function scoreConfirmationRows(
  confirmation: ScoreConfirmation,
  viewerUserId: string,
  names: ReadonlyMap<string, string>,
) {
  const confirmed = new Set(confirmation.confirmedUserIds);
  return confirmation.requiredUserIds.map((userId) => ({
    userId,
    label: `${names.get(userId) ?? "Player"}${userId === viewerUserId ? " (You)" : ""}`,
    confirmed: confirmed.has(userId),
    status: confirmed.has(userId) ? "Confirmed" : "Waiting",
  }));
}

export function scoreShowsConfirmations(input: {
  confirmation: ScoreConfirmation | null;
  hasResult: boolean;
  phase: FriendlyScorePhase;
}) {
  return (
    input.confirmation != null &&
    input.hasResult &&
    input.phase === "needs_results"
  );
}

export function scoreCanConfirm(input: {
  confirmation: ScoreConfirmation | null;
  hasResult: boolean;
  phase: FriendlyScorePhase;
  viewerUserId: string;
}) {
  return (
    input.confirmation != null &&
    input.hasResult &&
    input.phase !== "final" &&
    input.confirmation.requiredUserIds.includes(input.viewerUserId) &&
    !input.confirmation.viewerHasConfirmed
  );
}
