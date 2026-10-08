"use client";

import { UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, type ReactNode } from "react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import {
  SetLevelForm,
  SetLevelMemberSummary,
} from "~/components/groups/set-level-form";
import { PageTitle } from "~/components/layout/page-title";
import { Button } from "~/components/ui/button";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import { groupMembersTabHref, playerProfilePath } from "~/lib/dashboard-paths";
import { groupMemberRowsLink } from "@repo/domain/player-profile";
import { api } from "~/trpc/react";

function SetLevelPageFrame({
  groupId,
  children,
}: {
  groupId: string;
  children: ReactNode;
}) {
  return (
    <DashboardShell title="Set Level" hidePageHeader hideMobileTopBar>
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 pb-6">
        <header className="mt-6 flex items-center gap-1.5 lg:mt-2">
          <BackButton
            href={groupMembersTabHref(groupId)}
            label="Back to Members"
          />
          <PageTitle className="text-ink">Set Level</PageTitle>
        </header>
        {children}
      </div>
    </DashboardShell>
  );
}

export default function SetLevelPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { id, userId } = use(params);
  const router = useRouter();
  const group = api.groups.byId.useQuery({ id });

  if (group.isLoading) {
    return (
      <SetLevelPageFrame groupId={id}>
        <div aria-busy="true" className="flex flex-col gap-5">
          <Skeleton className="rounded-card h-24 w-full" />
          <Skeleton className="rounded-card h-48 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </SetLevelPageFrame>
    );
  }

  if (!group.data) {
    return (
      <SetLevelPageFrame groupId={id}>
        <ErrorState
          title="Group could not be loaded"
          message={group.error?.message}
          onRetry={() => {
            void group.refetch();
          }}
        />
      </SetLevelPageFrame>
    );
  }

  const entry = group.data.viewerCanSetLevel
    ? group.data.standing.leaderboard.find(
        (candidate) => candidate.userId === userId && !candidate.isViewer,
      )
    : undefined;

  if (!entry) {
    return (
      <SetLevelPageFrame groupId={id}>
        <EmptyState
          icon={UserX}
          title="Level can't be set"
          description="This person isn't a member whose Level you can set in this Group."
          action={
            <Button asChild>
              <Link href={groupMembersTabHref(id)}>Back to Members</Link>
            </Button>
          }
        />
      </SetLevelPageFrame>
    );
  }

  const member = {
    userId: entry.userId,
    name: entry.name ?? "Member",
    levelBand: entry.levelBand,
    levelProvisional: entry.levelProvisional,
    level: entry.level,
    ratedMatchCount: entry.ratedMatchCount,
    levelOverride: entry.levelOverride,
  };

  return (
    <SetLevelPageFrame groupId={id}>
      <SetLevelMemberSummary
        member={member}
        profileHref={
          groupMemberRowsLink(group.data.membership)
            ? playerProfilePath(member.userId)
            : undefined
        }
      />
      <SetLevelForm
        groupId={id}
        member={member}
        onSaved={() => router.push(groupMembersTabHref(id, member.userId))}
      />
    </SetLevelPageFrame>
  );
}
