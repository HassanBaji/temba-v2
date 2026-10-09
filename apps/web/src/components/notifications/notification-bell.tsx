"use client";

import { BellIcon } from "lucide-react";
import Link from "next/link";

import { useInviteInboxCount } from "~/hooks/use-invite-inbox-count";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const UNREAD_POLL_MS = 60_000;

export function NotificationBell({ className }: { className?: string }) {
  const unread = api.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: UNREAD_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const inviteCount = useInviteInboxCount();
  const showDot = (unread.data?.count ?? 0) > 0 || inviteCount > 0;

  return (
    <Link
      href="/dashboard/notifications"
      aria-label={showDot ? "Notifications, unread" : "Notifications"}
      className={cn(
        "border-rule text-ink focus-visible:ring-ring/50 relative flex size-11 shrink-0 items-center justify-center rounded-md border outline-none focus-visible:ring-[3px]",
        className,
      )}
    >
      <BellIcon aria-hidden="true" className="size-5" />
      {showDot ? (
        <span
          aria-hidden="true"
          className="bg-ink absolute right-1.5 top-1.5 size-1.5 rounded-full"
        />
      ) : null}
    </Link>
  );
}
