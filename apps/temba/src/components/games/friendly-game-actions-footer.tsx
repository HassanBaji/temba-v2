"use client";

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
} from "~/lib/game-copy";
import { cn } from "~/lib/utils";

/**
 * Organiser actions footer (game-details redesign, TEM-184): quiet,
 * full-width text buttons at the very bottom of the individual Friendly game
 * details page, above a hairline — never inside the Score section, never
 * inside the organizer overflow menu (that duplicate placement is removed by
 * this ticket, see `friendly-game-cta.ts`/`friendly-game-overflow-menu.tsx`).
 * One organiser action per phase, plus "Leave Game" for every seated or
 * registered (non-waitlisted) User who `canLeave`, including an organizer
 * who also sits, in every phase:
 *
 * - Upcoming/Ongoing (organizer): "Edit Game" (no consequence line — not
 *   destructive) and "Cancel Game" (existing `cancel` door, unchanged
 *   permission, new copy only).
 * - Needs a score (organizer): "Mark as not played" (existing
 *   `cancelMatch`/`cancel` door — Friendly Match-cancel already cascades to
 *   Game-cancel per ADR-0008 and produces no rating event per ADR-0009, so no
 *   new mutation is needed here).
 * - Final (organizer): "Report a wrong score", gated by TEM-185's
 *   `canReportWrongScore` eligibility read — eligible renders a live,
 *   confirm-dialog-gated action; ineligible renders disabled/inert with
 *   support-routing copy instead of a button that would fail on tap.
 * - Every phase (seated/registered, not waitlisted): "Leave Game" (existing
 *   `leave` door and `canLeave` check, unchanged permission). Distinct from
 *   Cancel Game.
 */
export type FriendlyGameActionsFooterPhase =
  | "upcoming"
  | "ongoing"
  | "needs_results"
  | "final";

export function FooterAction({
  label,
  consequence,
  onClick,
  pending = false,
  disabled = false,
}: {
  label: string;
  consequence?: string;
  onClick?: () => void;
  pending?: boolean;
  disabled?: boolean;
}) {
  const inert = disabled && !onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      aria-disabled={inert ? true : undefined}
      className={cn(
        "focus-visible:ring-ring/50 w-full px-[22px] py-4 text-left outline-none",
        "focus-visible:ring-[3px]",
        inert
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-wash disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <span className="text-body block font-medium">{label}</span>
      {consequence ? (
        <span className="text-muted-foreground text-meta mt-0.5 block">
          {consequence}
        </span>
      ) : null}
    </button>
  );
}

export function FriendlyGameActionsFooter({
  phase,
  isOrganizer,
  canLeaveGame,
  canReportWrongScore,
  playerCount,
  cancelGamePending,
  markAsNotPlayedPending,
  reportWrongScorePending,
  leaveGamePending,
  onEditGame,
  onCancelGame,
  onMarkAsNotPlayed,
  onReportWrongScore,
  onLeaveGame,
}: {
  phase: FriendlyGameActionsFooterPhase;
  isOrganizer: boolean;
  canLeaveGame: boolean;
  canReportWrongScore: { eligible: boolean; reason?: string } | null;
  playerCount: number;
  cancelGamePending: boolean;
  markAsNotPlayedPending: boolean;
  reportWrongScorePending: boolean;
  leaveGamePending: boolean;
  onEditGame: () => void;
  onCancelGame: () => void;
  onMarkAsNotPlayed: () => void;
  onReportWrongScore: () => void;
  onLeaveGame: () => void;
}) {
  const isUpcoming = phase === "upcoming" || phase === "ongoing";

  if (!isOrganizer && !canLeaveGame) {
    return null;
  }

  return (
    <div
      data-slot="friendly-game-actions-footer"
      className="border-rule divide-rule divide-y border-t"
    >
      {isOrganizer && isUpcoming ? (
        <>
          <FooterAction label={EDIT_GAME_ACTION} onClick={onEditGame} />
          <FooterAction
            label={CANCEL_GAME_ACTION}
            consequence={cancelGameConsequence(playerCount)}
            onClick={onCancelGame}
            pending={cancelGamePending}
          />
        </>
      ) : null}
      {isOrganizer && phase === "needs_results" ? (
        <FooterAction
          label={MARK_AS_NOT_PLAYED_ACTION}
          consequence={MARK_AS_NOT_PLAYED_CONSEQUENCE}
          onClick={onMarkAsNotPlayed}
          pending={markAsNotPlayedPending}
        />
      ) : null}
      {isOrganizer && phase === "final" ? (
        canReportWrongScore?.eligible ? (
          <FooterAction
            label={REPORT_WRONG_SCORE_ACTION}
            consequence={REPORT_WRONG_SCORE_CONSEQUENCE}
            onClick={onReportWrongScore}
            pending={reportWrongScorePending}
          />
        ) : (
          <FooterAction
            label={REPORT_WRONG_SCORE_ACTION}
            consequence={REPORT_WRONG_SCORE_LOCKED_CONSEQUENCE}
            disabled
          />
        )
      ) : null}
      {canLeaveGame ? (
        <FooterAction
          label={LEAVE_GAME_ACTION}
          consequence={LEAVE_GAME_CONSEQUENCE}
          onClick={onLeaveGame}
          pending={leaveGamePending}
        />
      ) : null}
    </div>
  );
}
