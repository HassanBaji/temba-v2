"use client";

import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { InviteKindBadge } from "~/components/temba/typed-labels";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function InvitesPage() {
  const utils = api.useUtils();
  const communityInvites = api.communities.pendingLookupInvites.useQuery();
  const groupInvites = api.groups.pendingLookupInvites.useQuery();
  const teamInvites = api.teams.pendingInvites.useQuery();
  const gameInvites = api.games.pendingLookupInvites.useQuery();

  const acceptCommunity = api.communities.acceptLookupInvite.useMutation({
    onSuccess: async () => {
      toast.success("Joined Community");
      await utils.communities.pendingLookupInvites.invalidate();
      await utils.communities.mine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const acceptGroup = api.groups.acceptLookupInvite.useMutation({
    onSuccess: async () => {
      toast.success("Joined Group");
      await utils.groups.pendingLookupInvites.invalidate();
      await utils.groups.mine.invalidate();
      await utils.communities.mine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

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

  const acceptGame = api.games.acceptLookupInvite.useMutation({
    onSuccess: async (result) => {
      toast.success(result.waitlisted ? "Joined Game waitlist" : "Joined Game");
      await utils.games.pendingLookupInvites.invalidate();
      await utils.games.byId.invalidate({ id: result.gameId });
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isLoading =
    communityInvites.isLoading ||
    groupInvites.isLoading ||
    teamInvites.isLoading ||
    gameInvites.isLoading;
  const error =
    communityInvites.error ??
    groupInvites.error ??
    teamInvites.error ??
    gameInvites.error;
  const items = [
    ...(communityInvites.data ?? []).map((invite) => ({
      kind: "community" as const,
      id: invite.id,
      title: invite.communityName,
      invitedBy: invite.invitedBy,
      createdAt: invite.createdAt,
    })),
    ...(groupInvites.data ?? []).map((invite) => ({
      kind: "group" as const,
      id: invite.id,
      title: invite.groupName ?? "Untitled Group",
      invitedBy: invite.invitedBy,
      createdAt: invite.createdAt,
    })),
    ...(teamInvites.data ?? []).map((invite) => ({
      kind: "team" as const,
      id: invite.id,
      title: invite.displayName,
      invitedBy: invite.invitedBy,
      createdAt: invite.createdAt,
    })),
    ...(gameInvites.data ?? []).map((invite) => ({
      kind: "game" as const,
      id: invite.id,
      title: invite.gameName,
      invitedBy: invite.invitedBy,
      createdAt: invite.createdAt,
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const acceptPending =
    acceptCommunity.isPending ||
    acceptGroup.isPending ||
    acceptTeam.isPending ||
    acceptGame.isPending;

  return (
    <DashboardShell
      title="Invites"
      description="Unused Lookup invites addressed to you. Accept here to join."
    >
      <div className="space-y-8">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {error ? (
          <p className="text-destructive text-sm">{error.message}</p>
        ) : null}

        {!isLoading && !error && items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You have no unused Lookup invites.
          </p>
        ) : null}

        {items.length > 0 ? (
          <ul className="divide-border border-border bg-card divide-y rounded-xl border">
            {items.map((invite) => (
              <li
                key={`${invite.kind}-${invite.id}`}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-foreground font-medium">
                      {invite.title}
                    </p>
                    <InviteKindBadge kind={invite.kind} />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    From {invite.invitedBy.name} ({invite.invitedBy.email})
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (invite.kind === "community") {
                      acceptCommunity.mutate({ inviteId: invite.id });
                      return;
                    }
                    if (invite.kind === "group") {
                      acceptGroup.mutate({ inviteId: invite.id });
                      return;
                    }
                    if (invite.kind === "game") {
                      acceptGame.mutate({ inviteId: invite.id });
                      return;
                    }
                    acceptTeam.mutate({ inviteId: invite.id });
                  }}
                  disabled={acceptPending}
                >
                  {acceptPending ? "Accepting…" : "Accept"}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </DashboardShell>
  );
}
