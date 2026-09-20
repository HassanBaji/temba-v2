export type SeatPosition = "left" | "right";

export type HalfTeamOccupant = {
  userId: string;
  name: string;
  image: string | null;
};

export type HalfTeam = {
  gameTeamId: string;
  sideIndex: number;
  occupant: HalfTeamOccupant;
  takenPosition: SeatPosition;
  openPosition: SeatPosition;
};

export type MergePositionAssignment = {
  firstPosition: SeatPosition;
  secondPosition: SeatPosition;
};

export const MERGE_COMPLETES_FIELD_COPY = "Merging them completes the field.";

export const MERGE_TAKES_EFFECT_COPY =
  "Takes effect immediately. Either of them can leave until the Pool draw.";

function otherPosition(position: SeatPosition): SeatPosition {
  return position === "left" ? "right" : "left";
}

export function halfTeamsFromSides(
  sides: readonly {
    sideIndex: number;
    gameTeamId: string | null;
    left: HalfTeamOccupant | null;
    right: HalfTeamOccupant | null;
  }[],
): HalfTeam[] {
  const halfTeams: HalfTeam[] = [];
  for (const side of sides) {
    if (!side.gameTeamId) {
      continue;
    }
    const leftTaken = side.left != null;
    const rightTaken = side.right != null;
    if (leftTaken === rightTaken) {
      continue;
    }
    const takenPosition: SeatPosition = leftTaken ? "left" : "right";
    const occupant = takenPosition === "left" ? side.left : side.right;
    if (!occupant) {
      continue;
    }
    halfTeams.push({
      gameTeamId: side.gameTeamId,
      sideIndex: side.sideIndex,
      occupant,
      takenPosition,
      openPosition: otherPosition(takenPosition),
    });
  }
  return halfTeams;
}

export function mergeCompletesTheField(halfTeams: readonly HalfTeam[]) {
  return halfTeams.length === 2;
}

export function halfTeamMergeHint(halfTeamCount: number) {
  return halfTeamCount === 2 ? MERGE_COMPLETES_FIELD_COPY : null;
}

export function defaultMergePositions(
  first: Pick<HalfTeam, "takenPosition">,
): MergePositionAssignment {
  return {
    firstPosition: first.takenPosition,
    secondPosition: otherPosition(first.takenPosition),
  };
}

export function swapMergePositions(
  assignment: MergePositionAssignment,
): MergePositionAssignment {
  return {
    firstPosition: assignment.secondPosition,
    secondPosition: assignment.firstPosition,
  };
}

export function samePositionMerge(assignment: MergePositionAssignment) {
  return assignment.firstPosition === assignment.secondPosition;
}

export function openPositionLabel(position: SeatPosition) {
  return position === "left" ? "Open left" : "Open right";
}

export function seatedPositionLabel(position: SeatPosition) {
  return position === "left" ? "Left" : "Right";
}
