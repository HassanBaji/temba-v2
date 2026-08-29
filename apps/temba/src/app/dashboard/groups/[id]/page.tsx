"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { use, useRef, useState } from "react";
import { toast } from "sonner";

import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from "~/components/common/action-menu";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { ErrorState } from "~/components/common/error-state";
import { StatStrip } from "~/components/common/stat-strip";
import { DashboardShell } from "~/components/dashboard-shell";
import { GroupGamesTab } from "~/components/groups/group-games-tab";
import { GroupHomeHeader } from "~/components/groups/group-home-header";
import { GroupHomeSkeleton } from "~/components/groups/group-home-skeleton";
import { GroupInvitesDialog } from "~/components/groups/group-invites-dialog";
import { GroupMembersTab } from "~/components/groups/group-members-tab";
import { GroupStandingTab } from "~/components/groups/group-standing-tab";
import { SoftArchiveBanner } from "~/components/temba/soft-archive-banner";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { isNotFoundError } from "~/lib/is-not-found-error";
import { stickyAsideClass } from "~/lib/page-layout";
import { api } from "~/trpc/react";

export default function GroupHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const utils = api.useUtils();
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);

  const group = api.groups.byId.useQuery({ id });

  const lookupInvites = api.groups.listLookupInvites.useQuery(
    { groupId: id },
    { enabled: Boolean(group.data?.canManageLookupInvites) },
  );

  const inviteLink = api.groups.getInviteLink.useQuery(
    { groupId: id },
    { enabled: Boolean(group.data?.canManageInviteLinks) },
  );

  const joinClubPublic = api.groups.joinClubPublic.useMutation({
    onSuccess: async () => {
      toast.success("Joined Group");
      await utils.groups.byId.invalidate({ id });
      await utils.groups.mine.invalidate();
      if (group.data?.communityId) {
        await utils.communities.byId.invalidate({
          id: group.data.communityId,
        });
        await utils.communities.mine.invalidate();
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const joinLoosePublic = api.groups.joinLoosePublic.useMutation({
    onSuccess: async () => {
      toast.success("Joined Group");
      await utils.groups.byId.invalidate({ id });
      await utils.groups.mine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const leaveGroup = api.groups.leave.useMutation({
    onSuccess: async (result) => {
      toast.success(
        result.communityId
          ? "Left Group — you remain in the Community"
          : "Left Group",
      );
      await utils.groups.byId.invalidate({ id });
      await utils.groups.mine.invalidate();
      if (result.communityId) {
        await utils.communities.byId.invalidate({ id: result.communityId });
        await utils.communities.mine.invalidate();
      }
    },
  });

  const deleteGroup = api.groups.delete.useMutation({
    onSuccess: async (result) => {
      toast.success("Group deleted");
      await utils.groups.mine.invalidate();
      if (result.communityId) {
        await utils.communities.byId.invalidate({ id: result.communityId });
        await utils.communities.mine.invalidate();
        router.push(`/dashboard/communities/${result.communityId}`);
        return;
      }
      router.push("/dashboard/groups");
    },
  });

  const createInviteLink = api.groups.createInviteLink.useMutation({
    onSuccess: async (result) => {
      await utils.groups.getInviteLink.invalidate({ groupId: id });
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success("Invite link copied");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendLookupInvite = api.groups.sendLookupInvite.useMutation({
    onSuccess: async () => {
      toast.success("Lookup invite sent");
      await utils.groups.listLookupInvites.invalidate({ groupId: id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const revokeLookupInvite = api.groups.revokeLookupInvite.useMutation({
    onSuccess: async () => {
      toast.success("Lookup invite revoked");
      await utils.groups.listLookupInvites.invalidate({ groupId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const joinPending = joinClubPublic.isPending || joinLoosePublic.isPending;

  function onJoin() {
    if (group.data?.canJoinLoosePublic) {
      joinLoosePublic.mutate({ groupId: id });
      return;
    }
    if (group.data?.canJoinClubPublic) {
      joinClubPublic.mutate({ groupId: id });
    }
  }

  async function copyGroupUrl() {
    const url = `${window.location.origin}/dashboard/groups/${id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Group URL copied");
  }

  if (isNotFoundError(group.error)) {
    notFound();
  }

  if (group.isLoading) {
    return (
      <DashboardShell title="Group" width="wide" hidePageHeader>
        <GroupHomeSkeleton />
      </DashboardShell>
    );
  }

  if (group.error) {
    return (
      <DashboardShell title="Group" width="wide" hidePageHeader>
        <ErrorState
          title="Group could not be loaded"
          message={group.error.message}
          onRetry={() => {
            void group.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  if (!group.data) {
    return (
      <DashboardShell title="Group" width="wide" hidePageHeader>
        <ErrorState
          title="Group could not be loaded"
          onRetry={() => {
            void group.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  const data = group.data;
  const groupName = data.name ?? "Group";
  const canManageInvites =
    data.canManageLookupInvites || data.canManageInviteLinks;
  const showMenu =
    data.community != null ||
    data.canCreateGame ||
    (data.isLoose && data.type === "public") ||
    canManageInvites ||
    data.membership != null ||
    data.canDelete;

  const headerActions = (
    <>
      {data.canJoin ? (
        <Button className="min-h-11" onClick={onJoin} disabled={joinPending}>
          {joinPending ? "Joining…" : "Join"}
        </Button>
      ) : null}
      {showMenu ? (
        <ActionMenu triggerRef={menuTriggerRef} label="Group actions">
          {data.community ? (
            <ActionMenuItem asChild>
              <Link href={`/dashboard/communities/${data.community.id}`}>
                Open {data.community.name}
              </Link>
            </ActionMenuItem>
          ) : null}
          {data.community ? (
            <ActionMenuItem asChild>
              <Link href="/dashboard/communities">All Communities</Link>
            </ActionMenuItem>
          ) : null}
          {data.canCreateGame ? (
            <ActionMenuItem asChild>
              <Link href={`/dashboard/games/new?groupId=${id}`}>
                Create Game
              </Link>
            </ActionMenuItem>
          ) : null}
          {data.isLoose && data.type === "public" ? (
            <ActionMenuItem onSelect={() => void copyGroupUrl()}>
              Copy Group URL
            </ActionMenuItem>
          ) : null}
          {canManageInvites ? (
            <ActionMenuItem onSelect={() => setInvitesOpen(true)}>
              Manage invites
            </ActionMenuItem>
          ) : null}
          {data.membership || data.canDelete ? <ActionMenuSeparator /> : null}
          {data.membership ? (
            <ActionMenuItem
              variant="destructive"
              onSelect={() => setLeaveOpen(true)}
            >
              Leave Group
            </ActionMenuItem>
          ) : null}
          {data.canDelete ? (
            <ActionMenuItem
              variant="destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              Delete Group
            </ActionMenuItem>
          ) : null}
        </ActionMenu>
      ) : null}
    </>
  );

  const standingStrip = data.membership ? (
    <StatStrip
      items={[
        {
          label: "Position",
          value:
            data.membership.standingPosition != null
              ? `#${data.membership.standingPosition} of ${data.standing.memberCount}`
              : `— of ${data.standing.memberCount}`,
        },
        { label: "Sets won", value: data.membership.totalSetsWon },
        { label: "Points won", value: data.membership.totalPointsWon },
        { label: "Games played", value: data.totalGamesPlayed },
      ]}
    />
  ) : null;

  const communityCard = data.community ? (
    <Card variant="raised">
      <p className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
        Community
      </p>
      <p className="text-lead font-semibold">{data.community.name}</p>
      <Button asChild variant="outline" className="min-h-11 w-full">
        <Link href={`/dashboard/communities/${data.community.id}`}>
          Open {data.community.name}
        </Link>
      </Button>
    </Card>
  ) : null;

  const staffCard =
    data.canCreateGame || canManageInvites ? (
      <Card variant="raised" className="gap-2">
        <p className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
          Actions
        </p>
        {data.canCreateGame ? (
          <Button asChild className="min-h-11 w-full">
            <Link href={`/dashboard/games/new?groupId=${id}`}>Create Game</Link>
          </Button>
        ) : null}
        {canManageInvites ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            onClick={() => setInvitesOpen(true)}
          >
            Manage invites
          </Button>
        ) : null}
      </Card>
    ) : null;

  const banners = (
    <>
      {data.isCommunityArchived && !data.communityMembership ? (
        <SoftArchiveBanner heading="This Club Group's Community is Soft-archived">
          It is not open for join. Members of the Community can still open
          history and Games. This is not a missing page.
        </SoftArchiveBanner>
      ) : null}

      {data.isCommunityArchived && data.communityMembership ? (
        <SoftArchiveBanner heading="Community Soft-archived">
          This Club Group stays attached to its Community. You can still open it
          and see history and Games while the Community is archived.
        </SoftArchiveBanner>
      ) : null}

      {data.communityId &&
      !data.communityMembership &&
      !data.isCommunityArchived ? (
        <p className="text-body text-muted-foreground">
          You cannot join this Club Group until you are a member of its
          Community.
        </p>
      ) : null}
    </>
  );

  const tabs = (
    <Tabs defaultValue="standing" className="gap-4">
      <TabsList
        variant="line"
        className="bg-background sticky top-11 z-20 h-11 min-h-11 w-full max-w-full justify-start overflow-x-auto overflow-y-hidden rounded-none lg:top-0"
      >
        <TabsTrigger
          value="standing"
          className="min-h-11 min-w-11 flex-none px-3"
        >
          Standing
        </TabsTrigger>
        <TabsTrigger value="games" className="min-h-11 min-w-11 flex-none px-3">
          Games
        </TabsTrigger>
        <TabsTrigger
          value="members"
          className="min-h-11 min-w-11 flex-none px-3"
        >
          Members
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="standing"
        className="focus-visible:ring-ring/50 rounded-md focus-visible:ring-[3px]"
      >
        <GroupStandingTab
          isMember={Boolean(data.membership)}
          leaderboard={data.standing.leaderboard}
        />
      </TabsContent>
      <TabsContent
        value="games"
        className="focus-visible:ring-ring/50 rounded-md focus-visible:ring-[3px]"
      >
        <GroupGamesTab
          upcomingGames={data.upcomingGames}
          gameHistory={data.gameHistory}
          groupName={groupName}
          isCommunityArchived={data.isCommunityArchived}
        />
      </TabsContent>
      <TabsContent
        value="members"
        className="focus-visible:ring-ring/50 rounded-md focus-visible:ring-[3px]"
      >
        <GroupMembersTab
          members={data.standing.leaderboard.map((entry) => ({
            userId: entry.userId,
            name: entry.name ?? "Member",
          }))}
        />
      </TabsContent>
    </Tabs>
  );

  return (
    <DashboardShell title={groupName} width="wide" hidePageHeader>
      <div className="space-y-6">
        <GroupHomeHeader
          name={groupName}
          isLoose={data.isLoose}
          type={data.type ?? null}
          sport={data.sport ?? null}
          communityName={data.community?.name ?? null}
          isCommunityArchived={data.isCommunityArchived}
          actions={headerActions}
        />

        {banners}

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
          <div className="min-w-0 space-y-6 lg:hidden">{standingStrip}</div>
          <div className="min-w-0">{tabs}</div>
          <aside className={stickyAsideClass}>
            {standingStrip}
            {communityCard}
            {staffCard}
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={`Leave ${groupName}?`}
        description="You will leave this Group. Cancelling does nothing."
        confirmLabel="Leave Group"
        pending={leaveGroup.isPending}
        restoreFocusRef={menuTriggerRef}
        onConfirm={async () => {
          await leaveGroup.mutateAsync({ groupId: id });
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${groupName}?`}
        description="This cannot be undone. Cancelling does nothing."
        confirmLabel="Delete Group"
        pending={deleteGroup.isPending}
        restoreFocusRef={menuTriggerRef}
        onConfirm={async () => {
          await deleteGroup.mutateAsync({ groupId: id });
        }}
      />

      <GroupInvitesDialog
        open={invitesOpen}
        onOpenChange={setInvitesOpen}
        restoreFocusRef={menuTriggerRef}
        isLoose={data.isLoose}
        canManageLookupInvites={data.canManageLookupInvites}
        canManageInviteLinks={data.canManageInviteLinks}
        lookupInvites={lookupInvites.data}
        inviteUrl={inviteLink.data?.inviteUrl}
        sendPending={sendLookupInvite.isPending}
        revokePending={revokeLookupInvite.isPending}
        copyPending={createInviteLink.isPending}
        sendError={sendLookupInvite.error}
        onSendLookup={(query) =>
          sendLookupInvite.mutate({ groupId: id, query })
        }
        onRevokeLookup={(inviteId) => revokeLookupInvite.mutate({ inviteId })}
        onCopyInviteLink={() => createInviteLink.mutate({ groupId: id })}
      />
    </DashboardShell>
  );
}
