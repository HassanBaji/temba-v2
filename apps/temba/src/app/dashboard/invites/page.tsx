"use client";

import { Inbox } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { GameSeatGrid } from "~/components/games/game-seat-grid";
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
      void gameInvites.refetch();
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
      needsSeatPick: invite.needsSeatPick,
      format: invite.format,
      registrationStatus: invite.registrationStatus,
      sides: invite.sides,
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
            if (
              invite.kind === "game" &&
              invite.needsSeatPick &&
              invite.sides
            ) {
              const joinFrozen =
                invite.registrationStatus === "closed" ||
                invite.registrationStatus === "cancelled";
              const waitlistOnly =
                !joinFrozen &&
                (invite.registrationStatus === "full" ||
                  invite.vacantSeats.length === 0);
              return (
                <li
                  key={`${invite.kind}-${invite.id}`}
                  className="space-y-3 px-4 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar name={inviterName} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="text-lead truncate font-semibold">
                        {invite.title}
                      </p>
                      <p className="text-meta text-muted-foreground truncate">
                        {inviteMeta(invite.kind, inviterName)}
                      </p>
                    </div>
                    <InviteKindBadge kind={invite.kind} />
                  </div>
                  <p className="text-body text-muted-foreground">
                    {joinFrozen
                      ? "Occupied seats show who is already registered. This Game is not open for registration."
                      : waitlistOnly
                        ? "No vacant Position. Occupied seats show who is already registered."
                        : "Occupied seats show who is already registered. Pick a vacant Position to sit."}
                  </p>
                  <GameSeatGrid
                    sides={invite.sides}
                    canJoinVacant={!joinFrozen && !waitlistOnly}
                    joinLabel="Sit here"
                    joining={pending}
                    canMove={false}
                    moving={false}
                    isOrganizer={false}
                    cancelled={joinFrozen}
                    kickPending={false}
                    onJoin={(sideIndex, position) =>
                      acceptGame.mutate({
                        inviteId: invite.id,
                        sideIndex,
                        position,
                      })
                    }
                    onMove={() => undefined}
                    onKick={() => undefined}
                    sideNoun={
                      invite.format === "friendly_tournament" ? "Side" : "Team"
                    }
                  />
                  {waitlistOnly ? (
                    <Button
                      className="min-h-11"
                      disabled={pending}
                      onClick={() => onAccept("game", invite.id)}
                    >
                      {pending ? "Joining…" : "Join waitlist"}
                    </Button>
                  ) : null}
                </li>
              );
            }
            return (
              <ListRow
                key={`${invite.kind}-${invite.id}`}
                leading={<UserAvatar name={inviterName} size="lg" />}
                title={invite.title}
                meta={inviteMeta(invite.kind, inviterName)}
                trailing={
                  <div className="flex flex-wrap items-center gap-2">
                    <InviteKindBadge kind={invite.kind} />
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
