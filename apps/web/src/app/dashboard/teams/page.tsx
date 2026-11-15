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
import { useLocale, useMessages } from "~/components/locale-provider";
import { PendingInvitesSection } from "~/components/invites/pending-invites-section";
import { PageCreateAction } from "~/components/layout/page-create-action";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { entityListIsEmpty } from "@repo/domain/entity-list-empty";
import { teamListRowView } from "@repo/domain/teams";
import { api } from "~/trpc/react";

export default function TeamsIndexPage() {
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const teams = api.teams.mine.useQuery();
  const pending = api.teams.pendingInvites.useQuery();
  const acceptTeam = api.teams.acceptInAppInvite.useMutation({
    onSuccess: async () => {
      toast.success(m.team.toast.joined);
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
      title={m.team.title}
      description={m.team.description}
      action={
        <PageCreateAction
          href="/dashboard/teams/new"
          label={m.team.createLabel}
        />
      }
    >
      {teams.isLoading ? <ListPageSkeleton rows={4} /> : null}

      {teams.error ? (
        <ErrorState
          title={m.team.errorTitle}
          error={teams.error}
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
                name={invite.invitedBy.name ?? m.team.memberFallback}
                image={invite.invitedBy.image}
                size="lg"
              />
            ),
            title: invite.displayName,
            invitedBy: invite.invitedBy.name ?? m.team.memberFallback,
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
            title={m.team.empty.title}
            description={m.team.empty.description}
            action={
              <Button asChild>
                <Link href="/dashboard/teams/new">{m.team.createLabel}</Link>
              </Button>
            }
          />
        ) : null}

        {teams.data && teams.data.length > 0 ? (
          <RowList>
            {teams.data.map((team) => {
              const row = teamListRowView(team, locale);
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
