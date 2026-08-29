import { Inbox } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { UserAvatar } from "~/components/common/user-avatar";
import { Button } from "~/components/ui/button";
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
  approveJoinPending,
  rejectJoinPending,
  approveTeamPending,
  rejectTeamPending,
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
  approveJoinPending: boolean;
  rejectJoinPending: boolean;
  approveTeamPending: boolean;
  rejectTeamPending: boolean;
  onApproveJoin: (requestId: string) => void;
  onRejectJoin: (requestId: string) => void;
  onApproveTeam: (requestId: string) => void;
  onRejectTeam: (requestId: string) => void;
}) {
  const joinBusy = approveJoinPending || rejectJoinPending;
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
                  <li
                    key={request.id}
                    className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar name={name} size="lg" />
                      <div className="min-w-0">
                        <p className="text-lead truncate font-semibold">
                          {name}
                        </p>
                        <p className="text-meta text-muted-foreground truncate">
                          Community join request
                          {request.user.email ? ` · ${request.user.email}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="min-h-11"
                        onClick={() => onApproveJoin(request.id)}
                        disabled={joinBusy}
                      >
                        Approve
                      </Button>
                      <Button
                        className="min-h-11"
                        variant="outline"
                        onClick={() => onRejectJoin(request.id)}
                        disabled={joinBusy}
                      >
                        Reject
                      </Button>
                    </div>
                  </li>
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
                  <li
                    key={request.id}
                    className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-lead truncate font-semibold">
                        {request.team.displayName}
                      </p>
                      <p className="text-meta text-muted-foreground truncate">
                        Team link request from {requester}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="min-h-11"
                        onClick={() => onApproveTeam(request.id)}
                        disabled={approveTeamPending}
                      >
                        Approve
                      </Button>
                      <Button
                        className="min-h-11"
                        variant="outline"
                        onClick={() => onRejectTeam(request.id)}
                        disabled={rejectTeamPending}
                      >
                        Reject
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Section>
      ) : null}
    </div>
  );
}
