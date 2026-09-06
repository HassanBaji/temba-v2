"use client";

import { notFound, usePathname, useRouter } from "next/navigation";
import { use, useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { ErrorState } from "~/components/common/error-state";
import { useCreateAccess } from "~/components/create-access-gate";
import { DashboardShell } from "~/components/dashboard-shell";
import { GroupGamesTab } from "~/components/groups/group-games-tab";
import { GroupHomeActionBar } from "~/components/groups/group-home-action-bar";
import { GroupHomeHeader } from "~/components/groups/group-home-header";
import { GroupHomeOverflowMenu } from "~/components/groups/group-home-overflow-menu";
import { GroupHomeRecordStrip } from "~/components/groups/group-home-record-strip";
import { GroupHomeSkeleton } from "~/components/groups/group-home-skeleton";
import { GroupHomeTopBar } from "~/components/groups/group-home-top-bar";
import { GroupInvitesDialog } from "~/components/groups/group-invites-dialog";
import { GroupMembersTab } from "~/components/groups/group-members-tab";
import { GroupStandingTab } from "~/components/groups/group-standing-tab";
import { SoftArchiveBanner } from "~/components/temba/soft-archive-banner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { groupHomeRecord } from "~/lib/group-home-chrome";
import {
  groupHomeCanManageInvites,
  groupHomeCanShowCreateGame,
  groupHomeCtaFamily,
  groupHomeOverflowItems,
} from "~/lib/group-home-cta";
import { groupInviteClipboardText } from "~/lib/group-invite-share-message";
import { groupHomeTabFromQuery, groupHomeTabQuery } from "~/lib/group-home-tab";
import { isNotFoundError } from "~/lib/is-not-found-error";
import { api } from "~/trpc/react";

export default function GroupHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = use(params);
  const query = use(searchParams);
  const tabParam = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab = groupHomeTabFromQuery(tabParam);
  const { hasCreateAccess } = useCreateAccess();
  const router = useRouter();
  const pathname = usePathname() ?? `/dashboard/groups/${id}`;
  const utils = api.useUtils();
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupRefused, setLookupRefused] = useState<
    { name: string; message: string }[] | null
  >(null);
  const [restoreFocus, setRestoreFocus] = useState<"mobile" | "desktop">(
    "desktop",
  );

  const group = api.groups.byId.useQuery({ id });

  const lookupInvites = api.groups.listLookupInvites.useQuery(
    { groupId: id },
    { enabled: Boolean(group.data?.canManageLookupInvites) },
  );
  const lookupSearch = api.groups.searchLookupUsers.useQuery(
    { groupId: id, query: lookupQuery },
    {
      enabled: invitesOpen && Boolean(group.data?.canManageLookupInvites),
    },
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
      await navigator.clipboard.writeText(
        groupInviteClipboardText({
          groupName: group.data?.name,
          sport: group.data?.sport,
          inviteUrl: result.shortUrl ?? result.inviteUrl,
        }),
      );
      toast.success("Invite link copied");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendLookupInvite = api.groups.sendLookupInvite.useMutation({
    onSuccess: async (result) => {
      setLookupRefused(result.refused);
      if (result.sent.length > 0) {
        toast.success(
          result.sent.length === 1
            ? "Lookup invite sent"
            : `${result.sent.length} Lookup invites sent`,
        );
      }
      await utils.groups.listLookupInvites.invalidate({ groupId: id });
      await utils.groups.searchLookupUsers.invalidate({ groupId: id });
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

  function setTab(next: string) {
    const resolved = groupHomeTabFromQuery(next);
    if (resolved === tab) {
      return;
    }
    router.replace(`${pathname}${groupHomeTabQuery(resolved)}`, {
      scroll: false,
    });
  }

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
      <DashboardShell title="Group" hidePageHeader hideMobileTopBar>
        <GroupHomeSkeleton />
      </DashboardShell>
    );
  }

  if (group.error) {
    return (
      <DashboardShell title="Group" hidePageHeader>
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
      <DashboardShell title="Group" hidePageHeader>
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
  const canShowCreateGame = groupHomeCanShowCreateGame({
    hasCreateAccess,
    canCreateGame: data.canCreateGame,
  });
  const canManageInvites = groupHomeCanManageInvites({
    canManageLookupInvites: data.canManageLookupInvites,
    canManageInviteLinks: data.canManageInviteLinks,
  });
  const ctaFamily = groupHomeCtaFamily({
    canJoin: data.canJoin,
    hasCreateAccess,
    canCreateGame: data.canCreateGame,
    canManageLookupInvites: data.canManageLookupInvites,
    canManageInviteLinks: data.canManageInviteLinks,
  });
  const overflowItems = groupHomeOverflowItems({
    family: ctaFamily,
    hasCommunity: data.community != null,
    canShowCreateGame,
    isLoosePublic: data.isLoose && data.type === "public",
    canManageInvites,
    isMember: data.membership != null,
    canDelete: data.canDelete,
  });
  const record = groupHomeRecord(data.membership);
  const restoreFocusRef =
    restoreFocus === "mobile" ? mobileMenuTriggerRef : desktopMenuTriggerRef;

  const overflowMenu = (which: "mobile" | "desktop") => (
    <GroupHomeOverflowMenu
      items={overflowItems}
      groupId={id}
      communityId={data.community?.id ?? null}
      communityName={data.community?.name ?? null}
      triggerRef={
        which === "mobile" ? mobileMenuTriggerRef : desktopMenuTriggerRef
      }
      onCopyGroupUrl={() => void copyGroupUrl()}
      onManageInvites={() => {
        setRestoreFocus(which);
        setInvitesOpen(true);
      }}
      onLeave={() => {
        setRestoreFocus(which);
        setLeaveOpen(true);
      }}
      onDelete={() => {
        setRestoreFocus(which);
        setDeleteOpen(true);
      }}
    />
  );

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

  return (
    <DashboardShell title={groupName} hidePageHeader hideMobileTopBar>
      <div className="md:-mt-6 lg:mt-0">
        <GroupHomeTopBar name={groupName} overflow={overflowMenu("mobile")} />
      </div>

      <div className="space-y-6">
        <GroupHomeHeader
          name={groupName}
          sport={data.sport ?? null}
          memberCount={data.standing.memberCount}
          communityName={data.community?.name ?? null}
          actions={overflowMenu("desktop")}
        />

        {banners}

        <GroupHomeRecordStrip record={record} />

        <GroupHomeActionBar
          family={ctaFamily}
          groupId={id}
          joinPending={joinPending}
          onJoin={onJoin}
          onInvite={() => setInvitesOpen(true)}
        />

        <Tabs value={tab} onValueChange={setTab} className="gap-4">
          <TabsList
            variant="line"
            className="bg-background sticky top-[52px] z-20 h-11 min-h-11 w-full max-w-full justify-stretch overflow-x-auto overflow-y-hidden rounded-none lg:top-0"
          >
            <TabsTrigger value="standing" className="min-h-11 min-w-11 flex-1">
              Standing
            </TabsTrigger>
            <TabsTrigger value="games" className="min-h-11 min-w-11 flex-1">
              Games
            </TabsTrigger>
            <TabsTrigger value="members" className="min-h-11 min-w-11 flex-1">
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
              groupId={id}
              canShowCreateGame={canShowCreateGame}
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
                image: entry.image,
                totalGamesPlayed: entry.totalGamesPlayed,
                isViewer: entry.isViewer,
                isCreator: entry.userId === data.createdBy,
              }))}
              canInvite={canManageInvites}
              onInvite={() => setInvitesOpen(true)}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={`Leave ${groupName}?`}
        description="You will leave this Group. Cancelling does nothing."
        confirmLabel="Leave Group"
        pending={leaveGroup.isPending}
        restoreFocusRef={restoreFocusRef}
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
        restoreFocusRef={restoreFocusRef}
        onConfirm={async () => {
          await deleteGroup.mutateAsync({ groupId: id });
        }}
      />

      <GroupInvitesDialog
        open={invitesOpen}
        onOpenChange={(next) => {
          setInvitesOpen(next);
          if (!next) {
            setLookupQuery("");
            setLookupRefused(null);
          }
        }}
        restoreFocusRef={restoreFocusRef}
        isLoose={data.isLoose}
        canManageLookupInvites={data.canManageLookupInvites}
        canManageInviteLinks={data.canManageInviteLinks}
        lookupInvites={lookupInvites.data}
        inviteUrl={inviteLink.data?.shortUrl ?? inviteLink.data?.inviteUrl}
        sendPending={sendLookupInvite.isPending}
        revokePending={revokeLookupInvite.isPending}
        copyPending={createInviteLink.isPending}
        sendError={sendLookupInvite.error}
        searchQuery={lookupQuery}
        onSearchQueryChange={setLookupQuery}
        searchResults={lookupSearch.data}
        searchPending={lookupSearch.isFetching}
        refused={lookupRefused}
        onSendLookup={(userIds) =>
          sendLookupInvite.mutate({ groupId: id, userIds })
        }
        onRevokeLookup={(inviteId) => revokeLookupInvite.mutate({ inviteId })}
        onCopyInviteLink={() => createInviteLink.mutate({ groupId: id })}
      />
    </DashboardShell>
  );
}
