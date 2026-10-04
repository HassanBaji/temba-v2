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
import { entityListIsEmpty } from "@repo/domain/entity-list-empty";
import {
  TEAMS_DESCRIPTION,
  TEAMS_EMPTY_COPY,
  TEAMS_ERROR_TITLE,
  TEAMS_TITLE,
  TEAM_CREATE_LABEL,
  TEAM_JOINED_TOAST,
  teamListRowView,
} from "@repo/domain/teams";
import { api } from "~/trpc/react";

export default function TeamsIndexPage() {
  const utils = api.useUtils();
  const teams = api.teams.mine.useQuery();
  const pending = api.teams.pendingInvites.useQuery();
  const acceptTeam = api.teams.acceptInAppInvite.useMutation({
    onSuccess: async () => {
      toast.success(TEAM_JOINED_TOAST);
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
      title={TEAMS_TITLE}
      description={TEAMS_DESCRIPTION}
      action={
        <PageCreateAction
          href="/dashboard/teams/new"
          label={TEAM_CREATE_LABEL}
        />
      }
    >
      {teams.isLoading ? <ListPageSkeleton rows={4} /> : null}

      {teams.error ? (
        <ErrorState
          title={TEAMS_ERROR_TITLE}
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
            title={TEAMS_EMPTY_COPY.title}
            description={TEAMS_EMPTY_COPY.description}
            action={
              <Button asChild>
                <Link href="/dashboard/teams/new">{TEAM_CREATE_LABEL}</Link>
              </Button>
            }
          />
        ) : null}

        {teams.data && teams.data.length > 0 ? (
          <RowList>
            {teams.data.map((team) => {
              const row = teamListRowView(team);
              return (
                <ListRow
                  key={team.id}
                  asChild
                  leading={
                    <AvatarStack
                      people={row.people}
                      openSeats={row.openSeats}
                      size="lg"
                    />
                  }
                  title={row.title}
                  meta={row.meta}
                  trailing={
                    row.incompleteLabel ? (
                      <Badge variant="outline">{row.incompleteLabel}</Badge>
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
