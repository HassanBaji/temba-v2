"use client";

import { BellIcon } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "~/components/common/user-avatar";
import { homeStateLine } from "~/components/home/home-state-line";
import { Skeleton } from "~/components/ui/skeleton";

export function HomeHeader({
  name,
  image,
  pendingInviteCount,
  bookedGameCount,
  ready,
}: {
  name: string;
  image?: string | null;
  pendingInviteCount: number;
  bookedGameCount: number;
  ready: boolean;
}) {
  const stateLine = ready
    ? homeStateLine(pendingInviteCount, bookedGameCount)
    : null;
  const unread = ready && pendingInviteCount > 0;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar
          name={name}
          image={image}
          size="lg"
          className="bg-ink text-paper [&_[data-slot=avatar-fallback]]:bg-ink [&_[data-slot=avatar-fallback]]:text-paper"
        />
        <div className="flex min-w-0 flex-col">
          <p className="min-w-0 truncate text-xl font-semibold tracking-[-0.02em]">
            {name}
          </p>
          {ready ? (
            stateLine ? (
              <p className="text-muted-foreground text-meta">{stateLine}</p>
            ) : null
          ) : (
            <Skeleton className="mt-1 h-3 w-28" />
          )}
        </div>
      </div>
      <Link
        href="/dashboard/invites"
        aria-label={unread ? "Invites, unread" : "Invites"}
        className="border-rule text-ink focus-visible:ring-ring/50 relative flex size-10 shrink-0 items-center justify-center rounded-md border outline-none focus-visible:ring-[3px]"
      >
        <BellIcon className="size-5" />
        {unread ? (
          <span
            aria-hidden="true"
            className="bg-ink absolute right-1.5 top-1.5 size-1.5 rounded-full"
          />
        ) : null}
      </Link>
    </div>
  );
}
