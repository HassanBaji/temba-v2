"use client";

import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
  friendlyGameLevelUpdatedLine,
  friendlyGameVacantSeatLine,
  friendlyGameWaitlistLine,
  type FriendlyGameCtaFamily,
} from "~/lib/friendly-game-cta";
import { cn } from "~/lib/utils";

/**
 * Sticky bottom action bar (game-details redesign, TEM-183). Renders one of
 * the three phase-driven states — Upcoming, Needs a score, Final — plus the
 * pre-existing browse/waitlist/registration states, off a single
 * `FriendlyGameCtaFamily` value. The viewer's own registration/seat status
 * is stated here and nowhere else on the page (no `text-success` "You're
 * playing" copy any more — that was green usage #2 being removed by this
 * ticket).
 */
export function FriendlyGameCtaBar({
  family,
  joinPending,
  waitlistPending,
  onJoin,
  onJoinWaitlist,
  onLeaveWaitlist,
  onAddResult,
  onInvite,
  onShareResult,
}: {
  family: FriendlyGameCtaFamily;
  joinPending: boolean;
  waitlistPending: boolean;
  onJoin: () => void;
  onJoinWaitlist: () => void;
  onLeaveWaitlist: () => void;
  onAddResult: () => void;
  onInvite?: () => void;
  onShareResult?: () => void;
}) {
  if (family.kind === "none") {
    return null;
  }

  return (
    <div
      data-slot="friendly-game-cta-bar"
      className={cn(
        "bg-background border-border max-lg:border-t max-lg:px-4 max-lg:py-3 max-lg:pb-6",
        "max-lg:fixed max-lg:inset-x-0 max-lg:z-40",
        "lg:bg-card lg:static lg:bottom-auto lg:rounded-2xl lg:border lg:p-4",
      )}
      style={{
        bottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {family.kind === "browse" ? (
        <Button asChild className="w-full">
          <Link href="/dashboard/games">Browse open games</Link>
        </Button>
      ) : null}

      {family.kind === "join_waitlist" ? (
        <Button
          type="button"
          className="w-full"
          disabled={joinPending}
          onClick={onJoinWaitlist}
        >
          {joinPending ? "Joining…" : "Join waitlist"}
        </Button>
      ) : null}

      {family.kind === "waitlisted" ? (
        <div className="flex items-center gap-3">
          <p className="text-body text-warning min-w-0 flex-1 font-semibold">
            {friendlyGameWaitlistLine(family.place)}
          </p>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={waitlistPending}
            onClick={onLeaveWaitlist}
          >
            Leave waitlist
          </Button>
        </div>
      ) : null}

      {family.kind === "join" ? (
        <Button
          type="button"
          className="w-full"
          disabled={joinPending}
          onClick={onJoin}
        >
          Join
        </Button>
      ) : null}

      {family.kind === "upcoming" ? (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold">You&apos;re in</p>
            {friendlyGameVacantSeatLine(family.vacantSeatCount) ? (
              <p className="text-muted-foreground text-meta">
                {friendlyGameVacantSeatLine(family.vacantSeatCount)}
              </p>
            ) : null}
          </div>
          {family.showInvite && onInvite ? (
            <Button type="button" className="shrink-0" onClick={onInvite}>
              Invite a player
            </Button>
          ) : null}
        </div>
      ) : null}

      {family.kind === "needs_score" ? (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold">Add the score</p>
            <p className="text-muted-foreground text-meta">
              Counts once the others confirm
            </p>
          </div>
          <Button type="button" className="shrink-0" onClick={onAddResult}>
            Add result
          </Button>
        </div>
      ) : null}

      {family.kind === "final" ? (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold">Level updated</p>
            <p className="text-muted-foreground text-meta">
              {friendlyGameLevelUpdatedLine(
                family.newLevelBand,
                family.newLevel,
              )}
            </p>
          </div>
          {onShareResult ? (
            <Button
              type="button"
              variant="ghost"
              className="shrink-0"
              onClick={onShareResult}
            >
              Share result
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
