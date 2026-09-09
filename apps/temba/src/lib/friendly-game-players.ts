export type FriendlyGameVacantSeatAction = "join" | "move" | null;

export type FriendlyGameOccupantAction = "kick";

export function friendlyGameSideFill(side: { left: unknown; right: unknown }) {
  const filled = (side.left != null ? 1 : 0) + (side.right != null ? 1 : 0);
  return { filled, label: `${filled}/2` };
}

export function friendlyGameVacantSeatAction(input: {
  cancelled: boolean;
  canMove: boolean;
  canRegister: boolean;
  canPickSeat: boolean;
  canWaitlist: boolean;
}): FriendlyGameVacantSeatAction {
  if (input.cancelled) {
    return null;
  }
  if (input.canMove) {
    return "move";
  }
  if (input.canRegister || input.canPickSeat || input.canWaitlist) {
    return "join";
  }
  return null;
}

/**
 * Line-up vacant hatch is move-only (TEM-193). Join stays the sticky CTA
 * sheet; do not reuse `friendlyGameVacantSeatAction`'s join branch here.
 */
export function friendlyGameLineupVacantAction(
  canMove: boolean,
): Extract<FriendlyGameVacantSeatAction, "move"> | null {
  return canMove ? "move" : null;
}

export function friendlyGameVacantSeatLabel(
  action: FriendlyGameVacantSeatAction,
  sideLabel: string,
  positionLabel: string,
) {
  if (action === "move") {
    return `Move to ${sideLabel} ${positionLabel}`;
  }
  if (action === "join") {
    return `Join ${sideLabel} ${positionLabel}`;
  }
  return null;
}

export function friendlyGameCanKickPlayer(input: {
  isOrganizer: boolean;
  cancelled: boolean;
  isViewer: boolean;
}) {
  return input.isOrganizer && !input.cancelled && !input.isViewer;
}

export function friendlyGameOccupantActions(input: {
  isOrganizer: boolean;
  cancelled: boolean;
  isViewer: boolean;
}): FriendlyGameOccupantAction[] {
  return friendlyGameCanKickPlayer(input) ? ["kick"] : [];
}

export function friendlyGamePlayersCancelledNote(cancelled: boolean) {
  return cancelled
    ? "This Game was cancelled. Seated people stay listed."
    : null;
}
