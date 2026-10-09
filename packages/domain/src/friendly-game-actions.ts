import {
  CANCEL_GAME_ACTION,
  EDIT_GAME_ACTION,
  LEAVE_GAME_ACTION,
  LEAVE_GAME_CONSEQUENCE,
  MARK_AS_NOT_PLAYED_ACTION,
  MARK_AS_NOT_PLAYED_CONSEQUENCE,
  REPORT_WRONG_SCORE_ACTION,
  REPORT_WRONG_SCORE_CONSEQUENCE,
  REPORT_WRONG_SCORE_LOCKED_CONSEQUENCE,
  cancelGameConsequence,
} from "./game-copy";
import {
  friendlyGameLevelUpdatedLine,
  friendlyGameVacantSeatLine,
  friendlyGameWaitlistLine,
  type FriendlyGameCtaFamily,
} from "./friendly-game-cta";

export type FriendlyGameFooterActionKind =
  | "edit"
  | "cancel_game"
  | "mark_as_not_played"
  | "report_wrong_score"
  | "report_wrong_score_locked"
  | "leave_game";

export type FriendlyGameFooterAction = {
  kind: FriendlyGameFooterActionKind;
  label: string;
  consequence: string | null;
  enabled: boolean;
};

export function friendlyGameFooterActions(input: {
  phase: "upcoming" | "ongoing" | "needs_results" | "final";
  isOrganizer: boolean;
  canLeaveGame: boolean;
  canReportWrongScore: { eligible: boolean } | null;
  playerCount: number;
}): FriendlyGameFooterAction[] {
  const actions: FriendlyGameFooterAction[] = [];
  const isUpcoming = input.phase === "upcoming" || input.phase === "ongoing";

  if (input.isOrganizer && isUpcoming) {
    actions.push(
      {
        kind: "edit",
        label: EDIT_GAME_ACTION,
        consequence: null,
        enabled: true,
      },
      {
        kind: "cancel_game",
        label: CANCEL_GAME_ACTION,
        consequence: cancelGameConsequence(input.playerCount),
        enabled: true,
      },
    );
  }
  if (input.isOrganizer && input.phase === "needs_results") {
    actions.push({
      kind: "mark_as_not_played",
      label: MARK_AS_NOT_PLAYED_ACTION,
      consequence: MARK_AS_NOT_PLAYED_CONSEQUENCE,
      enabled: true,
    });
  }
  if (input.isOrganizer && input.phase === "final") {
    actions.push(
      input.canReportWrongScore?.eligible
        ? {
            kind: "report_wrong_score",
            label: REPORT_WRONG_SCORE_ACTION,
            consequence: REPORT_WRONG_SCORE_CONSEQUENCE,
            enabled: true,
          }
        : {
            kind: "report_wrong_score_locked",
            label: REPORT_WRONG_SCORE_ACTION,
            consequence: REPORT_WRONG_SCORE_LOCKED_CONSEQUENCE,
            enabled: false,
          },
    );
  }
  if (input.canLeaveGame) {
    actions.push({
      kind: "leave_game",
      label: LEAVE_GAME_ACTION,
      consequence: LEAVE_GAME_CONSEQUENCE,
      enabled: true,
    });
  }
  return actions;
}

export type FriendlyGameCtaCopy = {
  title: string | null;
  subline: string | null;
  actionLabel: string | null;
  pendingLabel: string | null;
};

export const CTA_JOIN_PENDING_LABEL = "Joining…";

export function friendlyGameCtaCopy(
  family: FriendlyGameCtaFamily,
): FriendlyGameCtaCopy | null {
  switch (family.kind) {
    case "none":
      return null;
    case "browse":
      return {
        title: null,
        subline: null,
        actionLabel: "Browse open games",
        pendingLabel: null,
      };
    case "join_waitlist":
      return {
        title: null,
        subline: null,
        actionLabel: "Join waitlist",
        pendingLabel: CTA_JOIN_PENDING_LABEL,
      };
    case "waitlisted":
      return {
        title: friendlyGameWaitlistLine(family.place),
        subline: null,
        actionLabel: "Leave waitlist",
        pendingLabel: null,
      };
    case "join":
      return {
        title: null,
        subline: null,
        actionLabel: "Join",
        pendingLabel: CTA_JOIN_PENDING_LABEL,
      };
    case "upcoming":
      return {
        title: "You're in",
        subline: friendlyGameVacantSeatLine(family.vacantSeatCount),
        actionLabel: family.showInvite ? "Invite a player" : null,
        pendingLabel: null,
      };
    case "needs_score":
      return {
        title: "Add the score",
        subline: "Counts once the others confirm",
        actionLabel: "Add result",
        pendingLabel: null,
      };
    case "final":
      return {
        title: "Level updated",
        subline: friendlyGameLevelUpdatedLine(
          family.newLevelBand,
          family.newLevel,
        ),
        actionLabel: "Share result",
        pendingLabel: null,
      };
  }
}
