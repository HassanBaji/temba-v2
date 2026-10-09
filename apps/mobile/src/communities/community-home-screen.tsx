import { useUser } from "@clerk/expo";
import {
  COMMUNITY_ARCHIVED_TOAST,
  COMMUNITY_ERROR_TITLE,
  COMMUNITY_JOIN_REQUESTED_TOAST,
  COMMUNITY_LEFT_TOAST,
  COMMUNITY_LOOKUP_NOTE,
  COMMUNITY_NOT_FOUND_COPY,
  COMMUNITY_REQUEST_APPROVED_TOAST,
  COMMUNITY_REQUEST_REJECTED_TOAST,
  COMMUNITY_TEAM_LINKED_TOAST,
  COMMUNITY_TEAM_LINK_REJECTED_TOAST,
  COMMUNITY_UNARCHIVED_TOAST,
  COMMUNITY_VENUE_LINK_REQUESTED_TOAST,
  COMMUNITY_VENUE_UNLINKED_TOAST,
  communityArchiveConfirm,
  communityHomeActions,
  communityLeaveConfirm,
  communityLeaveNotices,
  communityRequestCount,
  communityRoleChangeAction,
  communityRoleUpdatedToast,
  communityUnlinkVenueConfirm,
  type CommunityMemberRow,
} from "@repo/domain/community";
import type { CommunityHomeTab } from "@repo/domain/community-home-tab";
import {
  roleChangeConfirmCopy,
  type CommunityRoleChange,
  type CommunityRoleValue,
} from "@repo/domain/community-role-change";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";

import type { ConfirmRequest } from "../game-details/confirm-sheet";
import { Notice } from "../groups/notice";
import { groupPath } from "../groups/groups-model";
import { InviteDoorSheet } from "../invites/invite-door-sheet";
import { apiOrigin } from "../lib/api-origin-runtime";
import { slotOf } from "../lib/slot-of";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { useToast } from "../primitives/toast";
import { teamPath } from "../teams/teams-model";
import { api } from "../trpc/react";
import { COMMUNITIES_PATH, newClubGroupPath } from "./communities-model";
import { CommunityHomeView } from "./community-home-view";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export function CommunityHomeScreen({ communityId }: { communityId: string }) {
  const { user } = useUser();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const hasCreateAccess = user?.publicMetadata.groupCreator === true;
  const [tab, setTab] = useState<CommunityHomeTab>("groups");
  const [refreshing, setRefreshing] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [venueOpen, setVenueOpen] = useState(false);
  const [venueQuery, setVenueQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const community = api.communities.byId.useQuery(
    { id: communityId },
    REFETCH_ON_FOREGROUND,
  );
  const data = community.data;

  const joinRequests = api.communities.listJoinRequests.useQuery(
    { communityId },
    {
      ...REFETCH_ON_FOREGROUND,
      enabled: Boolean(data?.canManageJoinRequests),
    },
  );
  const teamLinkRequests = api.communities.listTeamLinkRequests.useQuery(
    { communityId },
    {
      ...REFETCH_ON_FOREGROUND,
      enabled: Boolean(data?.canManageTeamLinks),
    },
  );
  const members = api.communities.listMembers.useQuery(
    { communityId },
    { ...REFETCH_ON_FOREGROUND, enabled: Boolean(data?.membership) },
  );
  const liveVenues = api.communities.searchLiveVenues.useQuery(
    { communityId, query: venueQuery.trim() },
    {
      enabled: venueOpen && Boolean(data?.canRequestVenueLink),
      placeholderData: (previous) => previous,
    },
  );

  const refreshHome = useCallback(
    () =>
      Promise.all([
        utils.communities.byId.invalidate({ id: communityId }),
        utils.communities.mine.invalidate(),
      ]),
    [utils, communityId],
  );

  function failed(error: { message: string }) {
    setActionError(error.message);
    toast.show(error.message);
  }

  const requestJoin = api.communities.requestJoin.useMutation({
    onSuccess: async () => {
      toast.show(COMMUNITY_JOIN_REQUESTED_TOAST);
      await utils.communities.byId.invalidate({ id: communityId });
    },
    onError: (error) => toast.show(error.message),
  });

  const approveJoin = api.communities.approveJoinRequest.useMutation({
    onSuccess: async () => {
      toast.show(COMMUNITY_REQUEST_APPROVED_TOAST);
      await Promise.all([
        utils.communities.listJoinRequests.invalidate({ communityId }),
        utils.communities.listMembers.invalidate({ communityId }),
        refreshHome(),
      ]);
    },
    onError: (error) => toast.show(error.message),
  });
  const rejectJoin = api.communities.rejectJoinRequest.useMutation({
    onSuccess: async () => {
      toast.show(COMMUNITY_REQUEST_REJECTED_TOAST);
      await Promise.all([
        utils.communities.listJoinRequests.invalidate({ communityId }),
        utils.communities.byId.invalidate({ id: communityId }),
      ]);
    },
    onError: (error) => toast.show(error.message),
  });
  const approveTeam = api.communities.approveTeamLink.useMutation({
    onSuccess: async () => {
      toast.show(COMMUNITY_TEAM_LINKED_TOAST);
      await Promise.all([
        utils.communities.listTeamLinkRequests.invalidate({ communityId }),
        utils.teams.mine.invalidate(),
        refreshHome(),
      ]);
    },
    onError: (error) => toast.show(error.message),
  });
  const rejectTeam = api.communities.rejectTeamLink.useMutation({
    onSuccess: async () => {
      toast.show(COMMUNITY_TEAM_LINK_REJECTED_TOAST);
      await utils.communities.listTeamLinkRequests.invalidate({ communityId });
    },
    onError: (error) => toast.show(error.message),
  });

  const requestVenueLink = api.communities.requestVenueLink.useMutation({
    onSuccess: async () => {
      toast.show(COMMUNITY_VENUE_LINK_REQUESTED_TOAST);
      await utils.communities.byId.invalidate({ id: communityId });
      setVenueOpen(false);
    },
    onError: (error) => toast.show(error.message),
  });
  const unlinkVenue = api.communities.unlinkVenue.useMutation({
    onSuccess: async () => {
      toast.show(COMMUNITY_VENUE_UNLINKED_TOAST);
      await refreshHome();
    },
    onError: failed,
    onSettled: () => setConfirm(null),
  });

  const leave = api.communities.leave.useMutation({
    onSuccess: async () => {
      toast.show(COMMUNITY_LEFT_TOAST);
      await Promise.all([
        refreshHome(),
        utils.groups.mine.invalidate(),
        utils.users.home.invalidate(),
      ]);
    },
    onError: failed,
    onSettled: () => setConfirm(null),
  });
  const softArchive = api.communities.softArchive.useMutation({
    onSuccess: async () => {
      toast.show(COMMUNITY_ARCHIVED_TOAST);
      await Promise.all([
        refreshHome(),
        utils.games.listPublicPickup.invalidate(),
        utils.games.listMyGames.invalidate(),
      ]);
    },
    onError: failed,
    onSettled: () => setConfirm(null),
  });
  const unarchive = api.communities.unarchive.useMutation({
    onSuccess: async () => {
      toast.show(COMMUNITY_UNARCHIVED_TOAST);
      await Promise.all([
        refreshHome(),
        utils.games.listPublicPickup.invalidate(),
        utils.games.listMyGames.invalidate(),
      ]);
    },
    onError: failed,
  });

  const setMemberRole = api.communities.setMemberRole.useMutation({
    onSuccess: async (result) => {
      toast.show(communityRoleUpdatedToast(result.role));
      await Promise.all([
        utils.communities.listMembers.invalidate({ communityId }),
        refreshHome(),
      ]);
    },
    onError: (error) => toast.show(error.message),
    onSettled: () => setConfirm(null),
  });

  function changeRole(row: CommunityMemberRow, role: CommunityRoleValue) {
    const change: CommunityRoleChange & { userId: string } = {
      userId: row.userId,
      name: row.name,
      isSelf: row.isSelf,
      from: row.role,
      to: role,
    };
    const action = communityRoleChangeAction(change);
    const apply = () =>
      setMemberRole.mutate({ communityId, userId: change.userId, role });
    if (action === "apply") {
      apply();
    } else if (action === "confirm") {
      setConfirm({ ...roleChangeConfirmCopy(change), onConfirm: apply });
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        community.refetch(),
        data?.canManageJoinRequests ? joinRequests.refetch() : null,
        data?.canManageTeamLinks ? teamLinkRequests.refetch() : null,
        data?.membership ? members.refetch() : null,
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [community, data, joinRequests, teamLinkRequests, members]);

  const header = <ScreenHeader nav="back" fallback={COMMUNITIES_PATH} />;

  if (isNotFoundError(community.error)) {
    return (
      <Screen>
        {header}
        <Notice {...COMMUNITY_NOT_FOUND_COPY} />
      </Screen>
    );
  }

  if (community.error && !data) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <Notice
          alert
          title={COMMUNITY_ERROR_TITLE}
          description={community.error.message}
          onRetry={() => void community.refetch()}
        />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        {header}
        <Skeleton height={72} radius={16} />
        <Skeleton height={44} radius={12} />
        <Skeleton height={200} radius={16} />
      </Screen>
    );
  }

  const actions = communityHomeActions(data, hasCreateAccess);
  const mutating = (pending: boolean, id: string | undefined) =>
    pending ? (id ?? null) : null;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <CommunityHomeView
        data={data}
        apiOrigin={apiOrigin}
        hasCreateAccess={hasCreateAccess}
        tab={tab}
        onTabChange={setTab}
        requestCount={communityRequestCount({
          join: joinRequests.data?.length,
          team: teamLinkRequests.data?.length,
        })}
        joinPending={requestJoin.isPending}
        actionError={actionError}
        confirm={confirm}
        confirmPending={
          leave.isPending ||
          softArchive.isPending ||
          unlinkVenue.isPending ||
          setMemberRole.isPending
        }
        unarchivePending={unarchive.isPending}
        onCloseConfirm={() => setConfirm(null)}
        onRequestJoin={() => requestJoin.mutate({ communityId })}
        onInvite={() => setInviteOpen(true)}
        onCreateClubGroup={() => router.push(newClubGroupPath(communityId))}
        onUnarchive={() => {
          setActionError(null);
          unarchive.mutate({ communityId });
        }}
        onLeave={() => {
          setActionError(null);
          setConfirm({
            ...communityLeaveConfirm(data.name),
            onConfirm: () => leave.mutate({ communityId }),
          });
        }}
        onArchive={() => {
          setActionError(null);
          setConfirm({
            ...communityArchiveConfirm(data.name),
            onConfirm: () => softArchive.mutate({ communityId }),
          });
        }}
        onOpenGroup={(groupId) => router.push(groupPath(groupId))}
        onOpenTeam={(teamId) => router.push(teamPath(teamId))}
        onLinkVenue={() => setVenueOpen(true)}
        onUnlinkVenue={() => {
          setActionError(null);
          setConfirm({
            ...communityUnlinkVenueConfirm(data.venue?.name ?? null),
            onConfirm: () => unlinkVenue.mutate({ communityId }),
          });
        }}
        members={{
          members: slotOf(members),
          query: memberQuery,
          onQueryChange: setMemberQuery,
          rolePending: setMemberRole.isPending,
          onRoleChange: changeRole,
          leaveNotices: communityLeaveNotices(data),
          onRetry: () => void members.refetch(),
        }}
        requests={{
          joinRequests: slotOf(joinRequests),
          teamLinkRequests: slotOf(teamLinkRequests),
          approveJoinPendingId: mutating(
            approveJoin.isPending,
            approveJoin.variables?.requestId,
          ),
          rejectJoinPendingId: mutating(
            rejectJoin.isPending,
            rejectJoin.variables?.requestId,
          ),
          approveTeamPendingId: mutating(
            approveTeam.isPending,
            approveTeam.variables?.requestId,
          ),
          rejectTeamPendingId: mutating(
            rejectTeam.isPending,
            rejectTeam.variables?.requestId,
          ),
          onApproveJoin: (requestId) => approveJoin.mutate({ requestId }),
          onRejectJoin: (requestId) => rejectJoin.mutate({ requestId }),
          onApproveTeam: (requestId) => approveTeam.mutate({ requestId }),
          onRejectTeam: (requestId) => rejectTeam.mutate({ requestId }),
          onRetryJoin: () => void joinRequests.refetch(),
          onRetryTeam: () => void teamLinkRequests.refetch(),
        }}
        venueSheet={{
          visible: venueOpen,
          onClose: () => setVenueOpen(false),
          query: venueQuery,
          onQueryChange: setVenueQuery,
          venues: slotOf(liveVenues),
          pendingVenueId: mutating(
            requestVenueLink.isPending,
            requestVenueLink.variables?.venueId,
          ),
          onRequest: (venueId) =>
            requestVenueLink.mutate({ communityId, venueId }),
          onRetry: () => void liveVenues.refetch(),
        }}
      />
      {actions.canInvite ? (
        <InviteDoorSheet
          visible={inviteOpen}
          onClose={() => setInviteOpen(false)}
          door={{
            kind: "community",
            communityId,
            note: COMMUNITY_LOOKUP_NOTE,
            canLookup: data.canManageLookupInvites,
            canLink: data.canManageInviteLinks,
          }}
        />
      ) : null}
    </Screen>
  );
}
