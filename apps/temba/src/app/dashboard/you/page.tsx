"use client";

import { useUser } from "@clerk/nextjs";

import { DashboardShell } from "~/components/dashboard-shell";
import { ProfileForm } from "~/components/you/profile-form-card";
import { ProfileHeader } from "~/components/you/profile-header";
import { ProfileIdentity } from "~/components/you/profile-identity";
import { ProfileLevel } from "~/components/you/profile-level-card";
import { usePendingInviteCount } from "~/hooks/use-pending-invite-count";

export default function YouPage() {
  const { isLoaded, user } = useUser();
  const invites = usePendingInviteCount();
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
        <ProfileLevel />
        <ProfileForm />
      </div>
    </DashboardShell>
  );
}
