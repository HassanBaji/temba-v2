import type { LevelBand } from "~/lib/level-bands";

export type SeatPosition = "left" | "right";

export type HalfTeamOccupant = {
  userId: string;
  name: string;
  image: string | null;
  levelBand?: LevelBand | null;
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

export const ORGANIZER_EYEBROW = "ORGANIZER";

export const MERGE_COMPLETES_FIELD_COPY = "Merging them completes the field.";

export const MERGE_TAKES_EFFECT_COPY =
  "Takes effect immediately. Either of them can leave until the group draw.";

export const MERGE_BANNER_TITLE = "Two Game teams have one Position each";

export const MERGE_BANNER_ACTION_LABEL = "Fix the seats";

export const MERGE_DRAWER_TITLE = "Two Half teams";

export const MERGE_PREVIEW_LABEL = "One Game team instead of two";

export const MERGE_PRIMARY_ACTION_LABEL = "Put them in one Game team";

export const MERGE_DISMISS_ACTION_LABEL = "Leave both Positions open";

export const MERGE_SWAP_LABEL = "Swap";

export const MERGE_SEATS_ACTION_LABEL = "Merge seats";

export const MERGE_MANY_TITLE = "Game teams have one Position each";

export const MERGE_SAME_POSITION_COPY =
  "Both Users would play the same Position";

export const MERGE_OPEN_POSITION_SR = "Open Position";

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

export function showOrganizerMergeBanner(args: {
  isOrganizer: boolean;
  cancelled: boolean;
  drawPosted: boolean;
  halfTeamCount: number;
  partnerRequired?: boolean;
}) {
  return (
    args.isOrganizer &&
    !args.cancelled &&
    !args.drawPosted &&
    args.halfTeamCount === 2 &&
    args.partnerRequired !== true
  );
}

export function canOpenOrganizerMergeDrawer(args: {
  isOrganizer: boolean;
  cancelled: boolean;
  drawPosted: boolean;
  halfTeamCount: number;
  partnerRequired?: boolean;
}) {
  return (
    args.isOrganizer &&
    !args.cancelled &&
    !args.drawPosted &&
    args.halfTeamCount >= 2 &&
    args.partnerRequired !== true
  );
}

export function mergeTeamEyebrow(sideIndex: number) {
  return `TEAM ${String(sideIndex).padStart(2, "0")}`;
}

export function mergeOccupantSubline(
  position: SeatPosition,
  levelLabel: string | null,
) {
  const seat = seatedPositionLabel(position);
  return levelLabel ? `${seat}, ${levelLabel}` : seat;
}

export function mergeOpenPositionLabel(position: SeatPosition) {
  return position === "left" ? "Left open" : "Right open";
}

export function mergePairCopy(args: {
  firstName: string;
  secondName: string;
  completesField: boolean;
  teamCount: number | null;
}) {
  const first = firstName(args.firstName) ?? args.firstName;
  const second = firstName(args.secondName) ?? args.secondName;
  const pair = `Put ${first} and ${second} together`;
  if (!args.completesField) {
    return `${pair}.`;
  }
  if (args.teamCount != null && args.teamCount > 0) {
    return `${pair} and the ${args.teamCount} Game teams are full.`;
  }
  return `${pair}. ${MERGE_COMPLETES_FIELD_COPY}`;
}

export function mergeDrawerLead(args: {
  firstName: string;
  secondName: string;
  completesField: boolean;
  teamCount: number | null;
}) {
  const first = firstName(args.firstName) ?? args.firstName;
  const second = firstName(args.secondName) ?? args.secondName;
  const start = `${first} and ${second} each took a seat on their own.`;
  if (args.completesField) {
    if (args.teamCount != null && args.teamCount > 0) {
      return `${start} Put them together and the ${args.teamCount} Game teams are full.`;
    }
    return `${start} ${MERGE_COMPLETES_FIELD_COPY}`;
  }
  return `${start} Put them together into one Game team.`;
}

export function mergeSwapHint(name: string, position: SeatPosition) {
  const first = firstName(name) ?? name;
  const seat = position === "left" ? "left" : "right";
  return `${first} keeps the ${seat} seat instead`;
}

export function mergeManyHalfTeamsCopy(halfTeamCount: number) {
  return `${halfTeamCount} Game teams have one Position each.`;
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

function firstName(name: string | null | undefined) {
  const token = name?.trim().split(/\s+/)[0];
  return token && token.length > 0 ? token : null;
}
