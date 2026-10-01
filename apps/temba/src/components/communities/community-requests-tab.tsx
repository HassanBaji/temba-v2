"use client";

import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { UserAvatar } from "~/components/common/user-avatar";
import { RequestRow } from "~/components/invites/request-row";
import { Skeleton } from "~/components/ui/skeleton";
import { requestRowMeta } from "~/lib/request-meta";
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
  const joinEmpty = hasJoin && joinRequests?.length === 0;
  const teamEmpty = hasTeam && teamLinkRequests?.length === 0;
  const bothEmpty = (!hasJoin || joinEmpty) && (!hasTeam || teamEmpty);

  if (bothEmpty && !joinLoading && !teamLoading && !joinError && !teamError) {
    return (
      <EmptyState
        icon={Inbox}
        title="No pending requests"
        description="Community join requests and Team link requests will show up here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-[26px]">
      {hasJoin ? (
        <RequestsCard title="Join requests">
          {joinLoading ? (
            <div className="px-5 py-4">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : null}
          {joinError ? (
            <ErrorState
              headingLevel={3}
              className="px-5"
              title="Join requests could not be loaded"
              message={joinError}
              onRetry={onRetryJoin}
            />
          ) : null}
          {joinRequests && joinRequests.length > 0 ? (
            <RequestRows>
              {joinRequests.map((request) => {
                const name = request.user.name ?? "User";
                return (
                  <RequestRow
                    key={request.id}
                    leading={
                      <UserAvatar
                        name={name}
                        image={request.user.image}
                        size="lg"
                      />
                    }
                    title={name}
                    meta={requestRowMeta(request.createdAt)}
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
        <RequestsCard title="Team link requests">
          {teamLoading ? (
            <div className="px-5 py-4">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : null}
          {teamError ? (
            <ErrorState
              headingLevel={3}
              className="px-5"
              title="Team link requests could not be loaded"
              message={teamError}
              onRetry={onRetryTeam}
            />
          ) : null}
          {teamLinkRequests && teamLinkRequests.length > 0 ? (
            <RequestRows>
              {teamLinkRequests.map((request) => {
                const requester = request.requestedBy.name ?? "User";
                return (
                  <RequestRow
                    key={request.id}
                    title={request.team.displayName}
                    meta={requestRowMeta(request.createdAt, [
                      `From ${requester}`,
                    ])}
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
