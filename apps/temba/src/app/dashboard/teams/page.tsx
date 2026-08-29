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
import { Section } from "~/components/layout/section";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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

  const isEmpty =
    !teams.isLoading &&
    !pending.isLoading &&
    (teams.data?.length ?? 0) === 0 &&
    (pending.data?.length ?? 0) === 0;

  return (
    <DashboardShell
      title="Teams"
      description="Partnerships you play as"
      action={
        <Button asChild>
          <Link href="/dashboard/teams/new">Create Team</Link>
        </Button>
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

      {!isEmpty && teams.data ? (
        <div className="space-y-8">
          {pending.data && pending.data.length > 0 ? (
            <Section title="Pending invites">
              <RowList>
                {pending.data.map((invite) => {
                  const accepting =
                    acceptTeam.isPending &&
                    acceptTeam.variables?.inviteId === invite.id;
                  return (
                    <ListRow
                      key={invite.id}
                      leading={
                        <UserAvatar
                          name={invite.invitedBy.name ?? "Member"}
                          size="lg"
                        />
                      }
                      title={invite.displayName}
                      meta={`Invite from ${invite.invitedBy.name}`}
                      trailing={
                        <Button
                          className="min-h-11"
                          disabled={accepting}
                          onClick={() =>
                            acceptTeam.mutate({ inviteId: invite.id })
                          }
                        >
                          {accepting ? "Accepting…" : "Accept"}
                        </Button>
                      }
                    />
                  );
                })}
              </RowList>
            </Section>
          ) : null}

          {teams.data.length > 0 ? (
            <RowList>
              {teams.data.map((team) => {
                const people = teamAvatarPeople(
                  team.displayName,
                  team.memberCount,
                  team.incomplete,
                );
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
      ) : null}
    </DashboardShell>
  );
}
