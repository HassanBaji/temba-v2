"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

import { PageTitle } from "~/components/layout/page-title";
import { useLocale, useMessages } from "~/components/locale-provider";
import { profileSettingsAriaLabel } from "@repo/domain/profile-chrome";

export function ProfileHeader({
  pendingInviteCount,
}: {
  pendingInviteCount: number;
}) {
  const m = useMessages();
  const locale = useLocale();
  const ariaLabel = profileSettingsAriaLabel(pendingInviteCount, locale);
  const showDot = pendingInviteCount > 0;

  return (
    <header className="flex items-center justify-between gap-3">
      <PageTitle className="text-ink truncate">{m.common.profile}</PageTitle>
      <Link
        href="/dashboard/you/settings"
        aria-label={ariaLabel}
        className="text-ink focus-visible:ring-ring/50 relative flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
      >
        <Settings aria-hidden="true" className="size-5" strokeWidth={2} />
        {showDot ? (
          <span
            aria-hidden="true"
            className="bg-ink absolute end-1.5 top-1.5 size-1.5 rounded-full"
          />
        ) : null}
      </Link>
    </header>
  );
}
