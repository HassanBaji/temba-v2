"use client";

import { Inbox } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import {
  InviteSeatPicker,
  parseSeatKey,
} from "~/components/games/invite-seat-picker";
import { InviteKindBadge } from "~/components/temba/typed-labels";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

function inviteMeta(
  kind: "community" | "group" | "team" | "game",
  name: string,
) {
  const label =
    kind === "community"
      ? "Community"
      : kind === "group"
        ? "Group"
        : kind === "team"
          ? "Team"
          : "Game";
  return `${label} invite from ${name}`;
}

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

  const [gameSeats, setGameSeats] = React.useState<Record<string, string>>({});

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
      needsSeatPick: false,
      vacantSeats: [] as { sideIndex: number; position: "left" | "right" }[],
    })),
    ...(groupInvites.data ?? []).map((invite) => ({
      kind: "group" as const,
      id: invite.id,
      title: invite.groupName ?? "Untitled Group",
      invitedBy: invite.invitedBy,
      createdAt: invite.createdAt,
      needsSeatPick: false,
      vacantSeats: [] as { sideIndex: number; position: "left" | "right" }[],
    })),
    ...(teamInvites.data ?? []).map((invite) => ({
      kind: "team" as const,
      id: invite.id,
      title: invite.displayName,
      invitedBy: invite.invitedBy,
      createdAt: invite.createdAt,
      needsSeatPick: false,
      vacantSeats: [] as { sideIndex: number; position: "left" | "right" }[],
    })),
    ...(gameInvites.data ?? []).map((invite) => ({
      kind: "game" as const,
      id: invite.id,
      title: invite.gameName,
      invitedBy: invite.invitedBy,
      createdAt: invite.createdAt,
      needsSeatPick: invite.needsSeatPick,
      vacantSeats: invite.vacantSeats,
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  function isRowPending(kind: string, id: string) {
    if (kind === "community") {
      return (
        acceptCommunity.isPending && acceptCommunity.variables?.inviteId === id
      );
    }
    if (kind === "group") {
      return acceptGroup.isPending && acceptGroup.variables?.inviteId === id;
    }
    if (kind === "game") {
      return acceptGame.isPending && acceptGame.variables?.inviteId === id;
    }
    return acceptTeam.isPending && acceptTeam.variables?.inviteId === id;
  }

  function onAccept(kind: (typeof items)[number]["kind"], id: string) {
    if (kind === "community") {
      acceptCommunity.mutate({ inviteId: id });
      return;
    }
    if (kind === "group") {
      acceptGroup.mutate({ inviteId: id });
      return;
    }
    if (kind === "game") {
      const invite = items.find((row) => row.kind === "game" && row.id === id);
      if (invite?.needsSeatPick && invite.vacantSeats.length > 0) {
        const seat = parseSeatKey(gameSeats[id] ?? "");
        if (!seat) {
          toast.error("Pick a vacant Position");
          return;
        }
        acceptGame.mutate({
          inviteId: id,
          sideIndex: seat.sideIndex,
          position: seat.position,
        });
        return;
      }
      acceptGame.mutate({ inviteId: id });
      return;
    }
    acceptTeam.mutate({ inviteId: id });
  }

  return (
    <DashboardShell
      title="Invites"
      description="Unused Lookup invites addressed to you. Accept here to join."
    >
      {isLoading ? <ListPageSkeleton rows={4} /> : null}

      {error ? (
        <ErrorState
          title="Invites could not be loaded"
          message={error.message}
          onRetry={() => {
            void communityInvites.refetch();
            void groupInvites.refetch();
            void teamInvites.refetch();
            void gameInvites.refetch();
          }}
        />
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nothing waiting"
          description="Lookup invites to Communities, Groups and Teams show up here."
        />
      ) : null}

      {items.length > 0 ? (
        <RowList>
          {items.map((invite) => {
            const pending = isRowPending(invite.kind, invite.id);
            const inviterName = invite.invitedBy.name ?? "Someone";
            return (
              <ListRow
                key={`${invite.kind}-${invite.id}`}
                leading={<UserAvatar name={inviterName} size="lg" />}
                title={invite.title}
                meta={inviteMeta(invite.kind, inviterName)}
                trailing={
                  <div className="flex flex-wrap items-center gap-2">
                    <InviteKindBadge kind={invite.kind} />
                    {invite.kind === "game" && invite.needsSeatPick ? (
                      <InviteSeatPicker
                        id={`invite-seat-${invite.id}`}
                        vacantSeats={invite.vacantSeats}
                        value={gameSeats[invite.id] ?? ""}
                        onChange={(value) =>
                          setGameSeats((current) => ({
                            ...current,
                            [invite.id]: value,
                          }))
                        }
                      />
                    ) : null}
                    <Button
                      className="min-h-11"
                      disabled={pending}
                      onClick={() => onAccept(invite.kind, invite.id)}
                    >
                      {pending ? "Accepting…" : "Accept"}
                    </Button>
                  </div>
                }
              />
            );
          })}
        </RowList>
      ) : null}
    </DashboardShell>
  );
}
