"use client";

import { Pencil, Settings } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "~/components/common/user-avatar";
import { PageTitle } from "~/components/layout/page-title";
import { useLocale, useMessages } from "~/components/locale-provider";
import {
  DETAILS_PATH,
  SETTINGS_PATH,
} from "~/components/settings/settings-screen";
import { Skeleton } from "~/components/ui/skeleton";
import { profileSettingsAriaLabel } from "@repo/domain/profile-chrome";
import { homeAreaLabel } from "@repo/domain/profile-details";

import { monthYear } from "./you-format";

const iconLinkClassName =
  "text-ink focus-visible:ring-ring/50 hover:bg-wash relative flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]";

export const profileAvatarClassName =
  "border-rule rounded-card size-14 border text-lead font-semibold data-[size=default]:size-14 data-[size=default]:rounded-card [&_[data-slot=avatar-fallback]]:rounded-card [&_[data-slot=avatar-fallback]]:bg-ink [&_[data-slot=avatar-fallback]]:text-paper [&_[data-slot=avatar-fallback]]:text-lead [&_[data-slot=avatar-fallback]]:font-semibold";

export function YouHeader({
  pendingInviteCount,
}: {
  pendingInviteCount: number;
}) {
  const m = useMessages();
  const locale = useLocale();

  return (
    <header className="flex items-center justify-between gap-3">
      <PageTitle className="text-ink truncate">{m.you.header.title}</PageTitle>
      <div className="flex shrink-0 items-center">
        <Link
          href={DETAILS_PATH}
          aria-label={m.you.header.edit}
          className={iconLinkClassName}
        >
          <Pencil aria-hidden="true" className="size-5" strokeWidth={2} />
        </Link>
        <Link
          href={SETTINGS_PATH}
          aria-label={profileSettingsAriaLabel(pendingInviteCount, locale)}
          className={iconLinkClassName}
        >
          <Settings aria-hidden="true" className="size-5" strokeWidth={2} />
          {pendingInviteCount > 0 ? (
            <span
              aria-hidden="true"
              className="bg-ink absolute end-1.5 top-1.5 size-1.5 rounded-full"
            />
          ) : null}
        </Link>
      </div>
    </header>
  );
}

export function YouIdentity({
  name,
  image,
  homeArea,
  memberSince,
}: {
  name: string;
  image: string | null;
  homeArea: string | null;
  memberSince: Date | string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const since = m.you.header.memberSince(monthYear(memberSince, locale));
  const line = homeArea
    ? m.you.header.areaAndSince(homeAreaLabel(homeArea, locale), since)
    : since;

  return (
    <div className="flex items-center gap-3.5">
      <UserAvatar
        name={name}
        image={image}
        className={profileAvatarClassName}
      />
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate text-[22px] font-bold tracking-[-0.01em]">
          {name}
        </p>
        <p className="text-meta text-muted-foreground mt-0.5 truncate">
          {line}
        </p>
      </div>
    </div>
  );
}

export function YouIdentitySkeleton() {
  return (
    <div aria-busy="true" className="flex items-center gap-3.5">
      <Skeleton className="rounded-card size-14 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-[22px] w-40 max-w-full" />
        <Skeleton className="h-3.5 w-56 max-w-full" />
      </div>
    </div>
  );
}
