"use client";

import Link from "next/link";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function TeamsIndexPage() {
  const utils = api.useUtils();
  const teams = api.teams.mine.useQuery();
  const pendingInvites = api.teams.pendingInvites.useQuery();

  const acceptInvite = api.teams.acceptInAppInvite.useMutation({
    onSuccess: async () => {
      toast.success("Joined Team");
      await utils.teams.mine.invalidate();
      await utils.teams.pendingInvites.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <DashboardShell title="My Teams">
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-foreground text-2xl font-semibold tracking-tight">
              My Teams
            </h2>
            <p className="text-muted-foreground text-sm">
              Partnerships you sit on. Open one to go to its home.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/teams/new">Create Team</Link>
          </Button>
        </div>

        {teams.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {teams.error ? (
          <p className="text-destructive text-sm">{teams.error.message}</p>
        ) : null}

        {teams.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You are not on any Teams yet.
          </p>
        ) : null}

        {teams.data && teams.data.length > 0 ? (
          <ul className="divide-border border-border bg-card divide-y rounded-xl border">
            {teams.data.map((team) => (
              <li key={team.id}>
                <Link
                  href={`/dashboard/teams/${team.id}`}
                  className="hover:bg-muted/50 flex flex-col gap-2 px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-foreground font-medium">
                      {team.displayName}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {team.community ? team.community.name : "Unattached"}
                      {team.incomplete ? " · Waiting for partner" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {team.community ? (
                      <Badge variant="outline">Club Team</Badge>
                    ) : (
                      <Badge variant="outline">Loose Team</Badge>
                    )}
                    {team.sport ? (
                      <Badge variant="secondary" className="capitalize">
                        {team.sport}
                      </Badge>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <section className="space-y-3">
          <h3 className="text-foreground text-lg font-semibold tracking-tight">
            Pending invites
          </h3>
          <p className="text-muted-foreground text-sm">
            In-app partner invites addressed to you.
          </p>

          {pendingInvites.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : null}

          {pendingInvites.error ? (
            <p className="text-destructive text-sm">
              {pendingInvites.error.message}
            </p>
          ) : null}

          {pendingInvites.data?.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You have no pending Team invites.
            </p>
          ) : null}

          {pendingInvites.data && pendingInvites.data.length > 0 ? (
            <ul className="divide-border border-border bg-card divide-y rounded-xl border">
              {pendingInvites.data.map((invite) => (
                <li
                  key={invite.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-foreground font-medium">
                      {invite.displayName}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      From {invite.invitedBy.name} ({invite.invitedBy.email})
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        acceptInvite.mutate({ inviteId: invite.id })
                      }
                      disabled={acceptInvite.isPending}
                    >
                      {acceptInvite.isPending ? "Accepting…" : "Accept"}
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/teams/${invite.teamId}`}>
                        Open
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </DashboardShell>
  );
}
