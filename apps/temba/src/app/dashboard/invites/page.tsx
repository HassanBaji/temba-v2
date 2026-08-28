"use client";

import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function InvitesPage() {
  const utils = api.useUtils();
  const pendingInvites = api.communities.pendingLookupInvites.useQuery();

  const acceptInvite = api.communities.acceptLookupInvite.useMutation({
    onSuccess: async () => {
      toast.success("Joined Community");
      await utils.communities.pendingLookupInvites.invalidate();
      await utils.communities.mine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <DashboardShell title="Invites">
      <div className="space-y-8">
        <div className="space-y-1">
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">
            Invites
          </h2>
          <p className="text-muted-foreground text-sm">
            Unused Lookup invites addressed to you. Accept here to join.
          </p>
        </div>

        {pendingInvites.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {pendingInvites.error ? (
          <p className="text-destructive text-sm">
            {pendingInvites.error.message}
          </p>
        ) : null}

        {pendingInvites.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You have no unused Lookup invites.
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
                    {invite.communityName}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    From {invite.invitedBy.name} ({invite.invitedBy.email})
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => acceptInvite.mutate({ inviteId: invite.id })}
                  disabled={acceptInvite.isPending}
                >
                  {acceptInvite.isPending ? "Accepting…" : "Accept"}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </DashboardShell>
  );
}
