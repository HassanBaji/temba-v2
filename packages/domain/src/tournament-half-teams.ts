import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import type { LevelBand } from "./level-bands";

export type SeatPosition = "left" | "right";

export type HalfTeamOccupant = {
  userId: string;
  name: string;
  image: string | null;
  levelBand?: LevelBand | null;
  guest?: boolean;
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

export function halfTeamMergeHint(halfTeamCount: number, locale: Locale) {
  return halfTeamCount === 2
    ? messagesFor(locale).tournament.halfTeams.mergeCompletesField
    : null;
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

export function mergeTeamEyebrow(sideIndex: number, locale: Locale) {
  return messagesFor(locale).tournament.halfTeams.teamEyebrow(
    String(sideIndex).padStart(2, "0"),
  );
}

export function mergeOccupantSubline(
  position: SeatPosition,
  levelLabel: string | null,
  locale: Locale,
) {
  const seat = seatedPositionLabel(position, locale);
  return levelLabel
    ? messagesFor(locale).tournament.halfTeams.occupantSubline(seat, levelLabel)
    : seat;
}

export function mergeOpenPositionLabel(position: SeatPosition, locale: Locale) {
  const m = messagesFor(locale).tournament.halfTeams;
  return position === "left" ? m.leftOpen : m.rightOpen;
}

export function mergePairCopy(args: {
  firstName: string;
  secondName: string;
  completesField: boolean;
  teamCount: number | null;
  locale: Locale;
}) {
  const m = messagesFor(args.locale).tournament.halfTeams;
  const first = firstName(args.firstName) ?? args.firstName;
  const second = firstName(args.secondName) ?? args.secondName;
  if (!args.completesField) {
    return m.putTogether(first, second);
  }
  if (args.teamCount != null && args.teamCount > 0) {
    return m.putTogetherFull(first, second, args.teamCount);
  }
  return m.putTogetherCompletes(first, second);
}

export function mergeDrawerLead(args: {
  firstName: string;
  secondName: string;
  completesField: boolean;
  teamCount: number | null;
  locale: Locale;
}) {
  const m = messagesFor(args.locale).tournament.halfTeams;
  const first = firstName(args.firstName) ?? args.firstName;
  const second = firstName(args.secondName) ?? args.secondName;
  if (args.completesField) {
    if (args.teamCount != null && args.teamCount > 0) {
      return m.drawerLeadFull(first, second, args.teamCount);
    }
    return m.drawerLeadCompletes(first, second);
  }
  return m.drawerLead(first, second);
}

export function mergeSwapHint(
  name: string,
  position: SeatPosition,
  locale: Locale,
) {
  const m = messagesFor(locale).tournament;
  const first = firstName(name) ?? name;
  return m.halfTeams.swapHint(first, m.position[`${position}Lower`]);
}

export function mergeManyHalfTeamsCopy(halfTeamCount: number, locale: Locale) {
  return messagesFor(locale).tournament.halfTeams.manyHalfTeams(halfTeamCount);
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

export function openPositionLabel(position: SeatPosition, locale: Locale) {
  const m = messagesFor(locale).tournament.halfTeams;
  return position === "left" ? m.openLeft : m.openRight;
}

export function seatedPositionLabel(position: SeatPosition, locale: Locale) {
  const m = messagesFor(locale).tournament.position;
  return position === "left" ? m.left : m.right;
}

function firstName(name: string | null | undefined) {
  const token = name?.trim().split(/\s+/)[0];
  return token && token.length > 0 ? token : null;
}
