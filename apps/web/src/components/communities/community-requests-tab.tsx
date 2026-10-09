"use client";

import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { UserAvatar } from "~/components/common/user-avatar";
import { RequestRow } from "~/components/invites/request-row";
import { Skeleton } from "~/components/ui/skeleton";
import {
  COMMUNITY_JOIN_REQUESTS_ERROR_TITLE,
  COMMUNITY_JOIN_REQUESTS_TITLE,
  COMMUNITY_REQUESTS_EMPTY,
  COMMUNITY_TEAM_LINK_REQUESTS_ERROR_TITLE,
  COMMUNITY_TEAM_LINK_REQUESTS_TITLE,
  communityJoinRequestRow,
  communityRequestsAreEmpty,
  communityTeamLinkRequestRow,
} from "@repo/domain/community";
import { type RouterOutputs } from "~/trpc/react";

type JoinRequest = RouterOutputs["communities"]["listJoinRequests"][number];
type TeamLinkRequest =
  RouterOutputs["communities"]["listTeamLinkRequests"][number];

function RequestsCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-rule overflow-hidden rounded-[14px] border">
      <h2 className="text-meta text-muted-foreground border-rule border-b px-5 py-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

function RequestRows({ children }: { children: ReactNode }) {
  return <ul className="divide-rule divide-y">{children}</ul>;
}

export function CommunityRequestsTab({
  canManageJoinRequests,
  canManageTeamLinks,
  joinRequests,
  joinLoading,
  joinError,
  onRetryJoin,
  teamLinkRequests,
  teamLoading,
  teamError,
  onRetryTeam,
  approveJoinPendingId,
  rejectJoinPendingId,
  approveTeamPendingId,
  rejectTeamPendingId,
  onApproveJoin,
  onRejectJoin,
  onApproveTeam,
  onRejectTeam,
}: {
  canManageJoinRequests: boolean;
  canManageTeamLinks: boolean;
  joinRequests: JoinRequest[] | undefined;
  joinLoading: boolean;
  joinError?: string;
  onRetryJoin: () => void;
  teamLinkRequests: TeamLinkRequest[] | undefined;
  teamLoading: boolean;
  teamError?: string;
  onRetryTeam: () => void;
  approveJoinPendingId?: string;
  rejectJoinPendingId?: string;
  approveTeamPendingId?: string;
  rejectTeamPendingId?: string;
  onApproveJoin: (requestId: string) => void;
  onRejectJoin: (requestId: string) => void;
  onApproveTeam: (requestId: string) => void;
  onRejectTeam: (requestId: string) => void;
}) {
  const hasJoin = canManageJoinRequests;
  const hasTeam = canManageTeamLinks;
  if (
    communityRequestsAreEmpty({
      canManageJoinRequests,
      canManageTeamLinks,
      joinCount: joinRequests?.length,
      teamCount: teamLinkRequests?.length,
      loading: joinLoading || teamLoading,
      failed: Boolean(joinError ?? teamError),
    })
  ) {
    return <EmptyState icon={Inbox} {...COMMUNITY_REQUESTS_EMPTY} />;
  }

  return (
    <div className="flex flex-col gap-[26px]">
      {hasJoin ? (
        <RequestsCard title={COMMUNITY_JOIN_REQUESTS_TITLE}>
          {joinLoading ? (
            <div className="px-5 py-4">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : null}
          {joinError ? (
            <ErrorState
              headingLevel={3}
              className="px-5"
              title={COMMUNITY_JOIN_REQUESTS_ERROR_TITLE}
              message={joinError}
              onRetry={onRetryJoin}
            />
          ) : null}
          {joinRequests && joinRequests.length > 0 ? (
            <RequestRows>
              {joinRequests.map((request) => {
                const row = communityJoinRequestRow(request);
                return (
                  <RequestRow
                    key={request.id}
                    leading={
                      <UserAvatar
                        name={row.title}
                        image={row.image}
                        size="lg"
                      />
                    }
                    title={row.title}
                    meta={row.meta}
                    approvePending={approveJoinPendingId === request.id}
                    rejectPending={rejectJoinPendingId === request.id}
                    onApprove={() => onApproveJoin(request.id)}
                    onReject={() => onRejectJoin(request.id)}
                  />
                );
              })}
            </RequestRows>
          ) : null}
        </RequestsCard>
      ) : null}

      {hasTeam ? (
        <RequestsCard title={COMMUNITY_TEAM_LINK_REQUESTS_TITLE}>
          {teamLoading ? (
            <div className="px-5 py-4">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : null}
          {teamError ? (
            <ErrorState
              headingLevel={3}
              className="px-5"
              title={COMMUNITY_TEAM_LINK_REQUESTS_ERROR_TITLE}
              message={teamError}
              onRetry={onRetryTeam}
            />
          ) : null}
          {teamLinkRequests && teamLinkRequests.length > 0 ? (
            <RequestRows>
              {teamLinkRequests.map((request) => {
                const row = communityTeamLinkRequestRow(request);
                return (
                  <RequestRow
                    key={request.id}
                    title={row.title}
                    meta={row.meta}
                    approvePending={approveTeamPendingId === request.id}
                    rejectPending={rejectTeamPendingId === request.id}
                    onApprove={() => onApproveTeam(request.id)}
                    onReject={() => onRejectTeam(request.id)}
                  />
                );
              })}
            </RequestRows>
          ) : null}
        </RequestsCard>
      ) : null}
    </div>
  );
}
