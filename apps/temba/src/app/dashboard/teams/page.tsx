"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { AvatarStack } from "~/components/common/avatar-stack";
import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { PendingInvitesSection } from "~/components/invites/pending-invites-section";
import { PageCreateAction } from "~/components/layout/page-create-action";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { entityListIsEmpty } from "~/lib/entity-list-empty";
import { teamAvatarPeople } from "~/lib/team-avatar-people";
import { api } from "~/trpc/react";

export default function TeamsIndexPage() {
  const utils = api.useUtils();
  const teams = api.teams.mine.useQuery();
  const pending = api.teams.pendingInvites.useQuery();
  const acceptTeam = api.teams.acceptInAppInvite.useMutation({
    onSuccess: async () => {
      toast.success("Joined Team");
      await utils.teams.pendingInvites.invalidate();
      await utils.teams.mine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isEmpty = entityListIsEmpty({
    list: {
      isLoading: teams.isLoading,
      error: teams.error,
      count: teams.data?.length ?? 0,
    },
    invites: { isLoading: pending.isLoading, count: pending.data?.length ?? 0 },
  });
  const acceptingId = acceptTeam.isPending
    ? (acceptTeam.variables?.inviteId ?? null)
    : null;

  return (
    <DashboardShell
      title="Teams"
      description="Partnerships you play as"
      action={
        <PageCreateAction href="/dashboard/teams/new" label="Create Team" />
      }
    >
      {teams.isLoading ? <ListPageSkeleton rows={4} /> : null}

      {teams.error ? (
        <ErrorState
          title="Teams could not be loaded"
          message={teams.error.message}
          onRetry={() => {
            void teams.refetch();
          }}
        />
      ) : null}

      <div className="space-y-6">
        <PendingInvitesSection
          invites={pending.data?.map((invite) => ({
            id: invite.id,
            leading: (
              <UserAvatar
                name={invite.invitedBy.name ?? "Member"}
                image={invite.invitedBy.image}
                size="lg"
              />
            ),
            title: invite.displayName,
            invitedBy: invite.invitedBy.name ?? "Member",
          }))}
          pendingId={acceptingId}
          error={pending.error}
          onAccept={(inviteId) => acceptTeam.mutate({ inviteId })}
          onRetry={() => {
            void pending.refetch();
          }}
        />

        {isEmpty ? (
          <EmptyState
            icon={Users}
            title="No Teams yet"
            description="A Team is a lasting partnership with one other player."
            action={
              <Button asChild>
                <Link href="/dashboard/teams/new">Create Team</Link>
              </Button>
            }
          />
        ) : null}

        {teams.data && teams.data.length > 0 ? (
          <RowList>
            {teams.data.map((team) => {
              const people = teamAvatarPeople(team.members);
              return (
                <ListRow
                  key={team.id}
                  asChild
                  leading={
                    <AvatarStack
                      people={people}
                      openSeats={team.incomplete ? 1 : 0}
                      size="lg"
                    />
                  }
                  title={team.displayName}
                  meta={
                    team.community
                      ? `Club Team · ${team.community.name}`
                      : "Not linked to a Community"
                  }
                  trailing={
                    team.incomplete ? (
                      <Badge variant="outline">Incomplete</Badge>
                    ) : undefined
                  }
                >
                  <Link href={`/dashboard/teams/${team.id}`} />
                </ListRow>
              );
            })}
          </RowList>
        ) : null}
      </div>
    </DashboardShell>
  );
}
