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
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import {
  gameInviteSeatCopy,
  lookupInviteAcceptToast,
  INVITE_JOIN_WAITLIST_LABEL,
  INVITE_SIT_HERE_LABEL,
  mergeInviteInbox,
} from "@repo/domain/invites";
import { api } from "~/trpc/react";

export default function InvitesPage() {
  const utils = api.useUtils();
  const communityInvites = api.communities.pendingLookupInvites.useQuery();
  const groupInvites = api.groups.pendingLookupInvites.useQuery();
  const teamInvites = api.teams.pendingInvites.useQuery();
  const gameInvites = api.games.pendingLookupInvites.useQuery();

  const acceptCommunity = api.communities.acceptLookupInvite.useMutation({
    onSuccess: async () => {
      toast.success(lookupInviteAcceptToast("community"));
      await utils.communities.pendingLookupInvites.invalidate();
      await utils.communities.mine.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const acceptGroup = api.groups.acceptLookupInvite.useMutation({
    onSuccess: async () => {
      toast.success(lookupInviteAcceptToast("group"));
      await utils.groups.pendingLookupInvites.invalidate();
      await utils.groups.mine.invalidate();
      await utils.communities.mine.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const acceptTeam = api.teams.acceptInAppInvite.useMutation({
    onSuccess: async () => {
      toast.success(lookupInviteAcceptToast("team"));
      await utils.teams.pendingInvites.invalidate();
      await utils.teams.mine.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const acceptGame = api.games.acceptLookupInvite.useMutation({
    onSuccess: async (result) => {
      toast.success(lookupInviteAcceptToast("game", result));
      await utils.games.pendingLookupInvites.invalidate();
      await utils.games.byId.invalidate({ id: result.gameId });
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
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
  const items = mergeInviteInbox({
    community: communityInvites.data,
    group: groupInvites.data,
    team: teamInvites.data,
    game: gameInvites.data,
  });

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
      description="Invites sent to you. Accept one to join."
    >
      {isLoading && items.length === 0 ? <ListPageSkeleton rows={4} /> : null}

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
          description="Invites to Games, Groups, Teams and Communities show up here."
        />
      ) : null}

      {items.length > 0 ? (
        <RowList>
          {items.map((invite) => {
            const pending = isRowPending(invite.kind, invite.id);
            const { inviterName, inviterImage, seatPick } = invite;
            if (invite.kind === "game" && seatPick) {
              const { joinFrozen, waitlistOnly } = seatPick;
              return (
                <li key={invite.key} className="space-y-3 px-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      name={inviterName}
                      image={inviterImage}
                      size="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-lead truncate font-semibold">
                        {invite.title}
                      </p>
                      <p className="text-meta text-muted-foreground truncate">
                        {invite.meta}
                      </p>
                    </div>
                    <InviteKindBadge kind={invite.kind} />
                  </div>
                  <p className="text-body text-muted-foreground">
                    {gameInviteSeatCopy(seatPick, "inbox")}
                  </p>
                  <GameSeatGrid
                    sides={seatPick.sides}
                    canJoinVacant={!joinFrozen && !waitlistOnly}
                    joinLabel={INVITE_SIT_HERE_LABEL}
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
                    sideNoun="Team"
                  />
                  {waitlistOnly ? (
                    <Button
                      className="min-h-11"
                      disabled={pending}
                      onClick={() => onAccept("game", invite.id)}
                    >
                      {pending ? "Joining…" : INVITE_JOIN_WAITLIST_LABEL}
                    </Button>
                  ) : null}
                </li>
              );
            }
            return (
              <ListRow
                key={invite.key}
                leading={
                  <UserAvatar
                    name={inviterName}
                    image={inviterImage}
                    size="lg"
                  />
                }
                title={invite.title}
                meta={invite.meta}
                stackTrailing
                trailing={
                  <div className="flex items-center gap-2">
                    <InviteKindBadge kind={invite.kind} />
                    <Button
                      aria-label={`Accept the invite to ${invite.title}`}
                      pending={pending}
                      pendingLabel="Accepting…"
                      onClick={() => onAccept(invite.kind, invite.id)}
                    >
                      Accept
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
