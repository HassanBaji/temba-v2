"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

import { profileSettingsAriaLabel } from "~/lib/profile-chrome";

export function ProfileHeader({
  pendingInviteCount,
}: {
  pendingInviteCount: number;
}) {
  const ariaLabel = profileSettingsAriaLabel(pendingInviteCount);
  const showDot = pendingInviteCount > 0;

  return (
    <header className="flex items-center justify-between gap-3">
      <h1 className="text-ink min-w-0 truncate text-[26px] font-bold tracking-[-0.01em]">
        Profile
      </h1>
      <Link
        href="/dashboard/you/settings"
        aria-label={ariaLabel}
        className="text-ink focus-visible:ring-ring/50 relative flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
      >
        <Settings aria-hidden="true" className="size-5" strokeWidth={2} />
        {showDot ? (
          <span
            aria-hidden="true"
            className="bg-ink absolute right-1.5 top-1.5 size-1.5 rounded-full"
          />
        ) : null}
      </Link>
    </header>
  );
}
