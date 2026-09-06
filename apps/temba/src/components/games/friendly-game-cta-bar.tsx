"use client";

import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
  friendlyGameWaitlistLine,
  type FriendlyGameCtaFamily,
} from "~/lib/friendly-game-cta";
import { cn } from "~/lib/utils";

export function FriendlyGameCtaBar({
  family,
  joinPending,
  waitlistPending,
  onJoin,
  onJoinWaitlist,
  onLeaveWaitlist,
  onEnterScore,
  onInvite,
}: {
  family: FriendlyGameCtaFamily;
  joinPending: boolean;
  waitlistPending: boolean;
  onJoin: () => void;
  onJoinWaitlist: () => void;
  onLeaveWaitlist: () => void;
  onEnterScore: () => void;
  onInvite?: () => void;
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

      {family.kind === "enter_score" ? (
        <Button type="button" className="w-full" onClick={onEnterScore}>
          Enter score
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

      {family.kind === "playing" ? (
        <div className="flex items-center gap-3">
          <p className="text-body text-success min-w-0 flex-1 font-semibold">
            You&apos;re playing
          </p>
          {family.showInvite && onInvite ? (
            <Button type="button" className="shrink-0" onClick={onInvite}>
              Invite
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
