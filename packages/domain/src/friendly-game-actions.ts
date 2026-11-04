import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  cancelGameAction,
  cancelGameConsequence,
  editGameAction,
  leaveGameAction,
  leaveGameConsequence,
  markAsNotPlayedAction,
  markAsNotPlayedConsequence,
  reportWrongScoreAction,
  reportWrongScoreConsequence,
  reportWrongScoreLockedConsequence,
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
  locale: Locale;
}): FriendlyGameFooterAction[] {
  const { locale } = input;
  const actions: FriendlyGameFooterAction[] = [];
  const isUpcoming = input.phase === "upcoming" || input.phase === "ongoing";

  if (input.isOrganizer && isUpcoming) {
    actions.push(
      {
        kind: "edit",
        label: editGameAction(locale),
        consequence: null,
        enabled: true,
      },
      {
        kind: "cancel_game",
        label: cancelGameAction(locale),
        consequence: cancelGameConsequence(input.playerCount, locale),
        enabled: true,
      },
    );
  }
  if (input.isOrganizer && input.phase === "needs_results") {
    actions.push({
      kind: "mark_as_not_played",
      label: markAsNotPlayedAction(locale),
      consequence: markAsNotPlayedConsequence(locale),
      enabled: true,
    });
  }
  if (input.isOrganizer && input.phase === "final") {
    actions.push(
      input.canReportWrongScore?.eligible
        ? {
            kind: "report_wrong_score",
            label: reportWrongScoreAction(locale),
            consequence: reportWrongScoreConsequence(locale),
            enabled: true,
          }
        : {
            kind: "report_wrong_score_locked",
            label: reportWrongScoreAction(locale),
            consequence: reportWrongScoreLockedConsequence(locale),
            enabled: false,
          },
    );
  }
  if (input.canLeaveGame && isUpcoming) {
    actions.push({
      kind: "leave_game",
      label: leaveGameAction(locale),
      consequence: leaveGameConsequence(locale),
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

export function friendlyGameCtaCopy(
  family: FriendlyGameCtaFamily,
  locale: Locale,
): FriendlyGameCtaCopy | null {
  const m = messagesFor(locale).game;
  switch (family.kind) {
    case "none":
      return null;
    case "browse":
      return {
        title: null,
        subline: null,
        actionLabel: m.cta.browseOpenGames,
        pendingLabel: null,
      };
    case "join_waitlist":
      return {
        title: null,
        subline: null,
        actionLabel: m.cta.joinWaitlist,
        pendingLabel: m.cta.joining,
      };
    case "waitlisted":
      return {
        title: friendlyGameWaitlistLine(family.place, locale),
        subline: null,
        actionLabel: m.action.leaveWaitlist,
        pendingLabel: null,
      };
    case "join":
      return {
        title: null,
        subline: null,
        actionLabel: m.cta.join,
        pendingLabel: m.cta.joining,
      };
    case "upcoming":
      return {
        title: m.cta.youreIn,
        subline: friendlyGameVacantSeatLine(family.vacantSeatCount, locale),
        actionLabel: family.showInvite ? m.cta.inviteAPlayer : null,
        pendingLabel: null,
      };
    case "needs_score":
      return {
        title: m.cta.addTheScore,
        subline: m.cta.countsOnceOthersConfirm,
        actionLabel: m.cta.addResult,
        pendingLabel: null,
      };
    case "final":
      return {
        title: m.cta.levelUpdated,
        subline: friendlyGameLevelUpdatedLine(
          family.newLevelBand,
          family.newLevel,
          locale,
        ),
        actionLabel: m.cta.shareResult,
        pendingLabel: null,
      };
  }
}
