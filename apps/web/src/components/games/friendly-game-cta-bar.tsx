"use client";

import Link from "next/link";

import { Button } from "~/components/ui/button";
import { friendlyGameCtaCopy } from "@repo/domain/friendly-game-actions";
import type { FriendlyGameCtaFamily } from "@repo/domain/friendly-game-cta";
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
  const copy = friendlyGameCtaCopy(family);
  if (!copy) {
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
          <Link href="/dashboard/games">{copy.actionLabel}</Link>
        </Button>
      ) : null}

      {family.kind === "join_waitlist" ? (
        <Button
          type="button"
          className="w-full"
          disabled={joinPending}
          onClick={onJoinWaitlist}
        >
          {joinPending ? copy.pendingLabel : copy.actionLabel}
        </Button>
      ) : null}

      {family.kind === "waitlisted" ? (
        <div className="flex items-center gap-3">
          <p className="text-body text-warning min-w-0 flex-1 font-semibold">
            {copy.title}
          </p>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={waitlistPending}
            onClick={onLeaveWaitlist}
          >
            {copy.actionLabel}
          </Button>
        </div>
      ) : null}

      {family.kind === "join" ? (
        <Button
          type="button"
          className="w-full"
          pending={joinPending}
          pendingLabel={copy.pendingLabel ?? undefined}
          onClick={onJoin}
        >
          {copy.actionLabel}
        </Button>
      ) : null}

      {family.kind === "upcoming" ? (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold">{copy.title}</p>
            {copy.subline ? (
              <p className="text-muted-foreground text-meta">{copy.subline}</p>
            ) : null}
          </div>
          {family.showInvite && onInvite ? (
            <Button type="button" className="shrink-0" onClick={onInvite}>
              {copy.actionLabel}
            </Button>
          ) : null}
        </div>
      ) : null}

      {family.kind === "needs_score" ? (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold">{copy.title}</p>
            <p className="text-muted-foreground text-meta">{copy.subline}</p>
          </div>
          <Button type="button" className="shrink-0" onClick={onAddResult}>
            {copy.actionLabel}
          </Button>
        </div>
      ) : null}

      {family.kind === "final" ? (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold">{copy.title}</p>
            <p className="text-muted-foreground text-meta">{copy.subline}</p>
          </div>
          {onShareResult ? (
            <Button
              type="button"
              variant="ghost"
              className="shrink-0"
              onClick={onShareResult}
            >
              {copy.actionLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
