"use client";

import { Inbox } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { UserAvatar } from "~/components/common/user-avatar";
import { RequestRow } from "~/components/invites/request-row";
import { Skeleton } from "~/components/ui/skeleton";
import { Section } from "~/components/layout/section";

type JoinRequest = {
  id: string;
  user: { name: string | null; email: string | null };
};

type TeamLinkRequest = {
  id: string;
  requestedBy: { name: string | null };
  team: { displayName: string; sport: string };
};

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
    <div className="space-y-8">
      {hasJoin ? (
        <Section
          title="Join requests"
          description="Approve to admit as Member, reject to refuse (they may re-request), or leave pending to ignore."
        >
          {joinLoading ? <Skeleton className="h-16 w-full" /> : null}
          {joinError ? (
            <ErrorState
              title="Join requests could not be loaded"
              message={joinError}
              onRetry={onRetryJoin}
            />
          ) : null}
          {joinRequests && joinRequests.length > 0 ? (
            <ul className="divide-border divide-y overflow-hidden rounded-lg border">
              {joinRequests.map((request) => {
                const name = request.user.name ?? "User";
                return (
                  <RequestRow
                    key={request.id}
                    leading={<UserAvatar name={name} size="lg" />}
                    title={name}
                    meta={
                      request.user.email
                        ? `Community join request · ${request.user.email}`
                        : "Community join request"
                    }
                    approvePending={approveJoinPendingId === request.id}
                    rejectPending={rejectJoinPendingId === request.id}
                    onApprove={() => onApproveJoin(request.id)}
                    onReject={() => onRejectJoin(request.id)}
                  />
                );
              })}
            </ul>
          ) : null}
        </Section>
      ) : null}

      {hasTeam ? (
        <Section
          title="Team link requests"
          description="Owner or Admin approve or reject. Approve auto-admits any seat who is not yet a Community Member, then attaches the Team."
        >
          {teamLoading ? <Skeleton className="h-16 w-full" /> : null}
          {teamError ? (
            <ErrorState
              title="Team link requests could not be loaded"
              message={teamError}
              onRetry={onRetryTeam}
            />
          ) : null}
          {teamLinkRequests && teamLinkRequests.length > 0 ? (
            <ul className="divide-border divide-y overflow-hidden rounded-lg border">
              {teamLinkRequests.map((request) => {
                const requester = request.requestedBy.name ?? "User";
                return (
                  <RequestRow
                    key={request.id}
                    title={request.team.displayName}
                    meta={`Team link request from ${requester}`}
                    approvePending={approveTeamPendingId === request.id}
                    rejectPending={rejectTeamPendingId === request.id}
                    onApprove={() => onApproveTeam(request.id)}
                    onReject={() => onRejectTeam(request.id)}
                  />
                );
              })}
            </ul>
          ) : null}
        </Section>
      ) : null}
    </div>
  );
}
