"use client";

import { cn } from "~/lib/utils";

/**
 * Organiser actions footer (game-details redesign, TEM-184): quiet,
 * full-width text buttons at the very bottom of the individual Friendly game
 * details page, above a hairline — never inside the Score section, never
 * inside the organizer overflow menu (that duplicate placement is removed by
 * this ticket, see `friendly-game-cta.ts`/`friendly-game-overflow-menu.tsx`).
 * One organiser action per phase, plus "Leave game" for every seated or
 * registered (non-waitlisted) User who `canLeave`, including an organizer
 * who also sits, in every phase:
 *
 * - Upcoming/Ongoing (organizer): "Edit game" (no consequence line — not
 *   destructive) and "Cancel game" (existing `cancel` door, unchanged
 *   permission, new copy only).
 * - Needs a score (organizer): "Mark as not played" (existing
 *   `cancelMatch`/`cancel` door — Friendly Match-cancel already cascades to
 *   Game-cancel per ADR-0008 and produces no rating event per ADR-0009, so no
 *   new mutation is needed here).
 * - Final (organizer): "Report a wrong score", gated by TEM-185's
 *   `canReportWrongScore` eligibility read — eligible renders a live,
 *   confirm-dialog-gated action; ineligible renders disabled/inert with
 *   support-routing copy instead of a button that would fail on tap.
 * - Every phase (seated/registered, not waitlisted): "Leave game" (existing
 *   `leave` door and `canLeave` check, unchanged permission). Distinct from
 *   Cancel game.
 */
export type FriendlyGameActionsFooterPhase =
  | "upcoming"
  | "ongoing"
  | "needs_results"
  | "final";

function FooterAction({
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
      <span className="block text-sm font-medium">{label}</span>
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
          <FooterAction label="Edit game" onClick={onEditGame} />
          <FooterAction
            label="Cancel game"
            consequence="Removes it from the calendar for all three players"
            onClick={onCancelGame}
            pending={cancelGamePending}
          />
        </>
      ) : null}
      {isOrganizer && phase === "needs_results" ? (
        <FooterAction
          label="Mark as not played"
          consequence="No result is recorded and nobody's level changes"
          onClick={onMarkAsNotPlayed}
          pending={markAsNotPlayedPending}
        />
      ) : null}
      {isOrganizer && phase === "final" ? (
        canReportWrongScore?.eligible ? (
          <FooterAction
            label="Report a wrong score"
            consequence="The other three players are asked to check it again"
            onClick={onReportWrongScore}
            pending={reportWrongScorePending}
          />
        ) : (
          <FooterAction
            label="Report a wrong score"
            consequence="A later rated game means this can't be self-corrected — contact support to fix it"
            disabled
          />
        )
      ) : null}
      {canLeaveGame ? (
        <FooterAction
          label="Leave game"
          consequence="Your spot can open for someone else."
          onClick={onLeaveGame}
          pending={leaveGamePending}
        />
      ) : null}
    </div>
  );
}
