"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { SportSegments } from "~/components/temba/sport-segments";
import { ProfileAllTime } from "~/components/you/profile-all-time-card";
import { ProfileForm } from "~/components/you/profile-form-card";
import { ProfileHeader } from "~/components/you/profile-header";
import { ProfileIdentity } from "~/components/you/profile-identity";
import { ProfileLevel } from "~/components/you/profile-level-card";
import { usePendingInviteCount } from "~/hooks/use-pending-invite-count";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";

export default function YouPage() {
  const { isLoaded, user } = useUser();
  const invites = usePendingInviteCount();
  const [sport, setSport] = useState<Sport>(DEFAULT_SPORT);
  const displayName =
    user?.fullName ?? user?.firstName ?? user?.username ?? "You";

  return (
    <DashboardShell width="content" hidePageHeader hideMobileTopBar>
      <div className="mx-auto mt-6 w-full min-w-0 max-w-[1000px] space-y-[26px] lg:mt-2">
        <ProfileHeader
          pendingInviteCount={invites.showCount ? invites.count : 0}
        />
        <ProfileIdentity
          displayName={displayName}
          hasImage={user?.hasImage ?? false}
          imageUrl={user?.imageUrl ?? null}
          canEditPhoto={user != null}
          ready={isLoaded}
        />
        <section aria-label="Your sport" className="space-y-[26px]">
          <SportSegments value={sport} onSelect={setSport} />
          <ProfileLevel sport={sport} />
          <ProfileForm sport={sport} />
          <ProfileAllTime sport={sport} />
        </section>
      </div>
    </DashboardShell>
  );
}
