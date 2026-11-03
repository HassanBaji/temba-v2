import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";

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
  locale: Locale,
) {
  const m = messagesFor(locale).game.players;
  if (action === "move") {
    return m.moveTo(sideLabel, positionLabel);
  }
  if (action === "join") {
    return m.joinSeat(sideLabel, positionLabel);
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

export function friendlyGamePlayersCancelledNote(
  cancelled: boolean,
  locale: Locale,
) {
  return cancelled ? messagesFor(locale).game.players.cancelledNote : null;
}

export function friendlyGameSeatSubline(
  position: "left" | "right",
  levelBand: LevelBand | null,
  locale: Locale,
) {
  const m = messagesFor(locale).game.players;
  const positionLabel = position === "left" ? m.leftSeat : m.rightSeat;
  if (!levelBand) {
    return positionLabel;
  }
  return m.seatWithLevel(positionLabel, displayLabelFromStoredBand(levelBand));
}

export function friendlyGameOpenSeatLabel(
  position: "left" | "right",
  locale: Locale,
) {
  const m = messagesFor(locale).game.players;
  return position === "left" ? m.openLeftSeat : m.openRightSeat;
}

export function friendlyGameInviteSeatLabel(
  sideLabel: string,
  position: "left" | "right",
  locale: Locale,
) {
  const m = messagesFor(locale).game.players;
  return position === "left"
    ? m.inviteToLeftSeat(sideLabel)
    : m.inviteToRightSeat(sideLabel);
}
