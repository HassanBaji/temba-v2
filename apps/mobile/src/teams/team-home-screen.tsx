import { isForbiddenError } from "@repo/domain/is-forbidden-error";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { teamLinkCommunityPicker } from "@repo/domain/team-link-community-picker";
import {
  TEAM_DISSOLVED_TOAST,
  TEAM_ERROR_TITLE,
  TEAM_FORBIDDEN_COPY,
  TEAM_LINK_REQUESTED_TOAST,
  TEAM_NOT_FOUND_COPY,
  TEAM_UNLINKED_TOAST,
  teamDissolveConfirm,
  teamHomeView,
  teamUnlinkConfirm,
} from "@repo/domain/teams";
import { Stack, useRouter } from "expo-router";
import { useCallback, useState } from "react";

import type { ConfirmRequest } from "../game-details/confirm-sheet";
import { Notice } from "../groups/notice";
import { InviteDoorSheet } from "../invites/invite-door-sheet";
import { Screen } from "../primitives/screen";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { TEAMS_PATH } from "./teams-model";
import { TeamHomeView } from "./team-home-view";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export function TeamHomeScreen({ teamId }: { teamId: string }) {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const [refreshing, setRefreshing] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    null,
  );
  const [linkError, setLinkError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const team = api.teams.byId.useQuery({ id: teamId }, REFETCH_ON_FOREGROUND);
  const data = team.data;

  const communities = api.communities.mine.useQuery(undefined, {
    enabled: Boolean(data?.canRequestLink),
  });
  const linkPicker = teamLinkCommunityPicker({
    isLoading: communities.isLoading,
    isError: communities.isError,
    data: communities.data,
  });

  const requestLink = api.teams.requestLink.useMutation({
    onSuccess: async () => {
      toast.show(TEAM_LINK_REQUESTED_TOAST);
      await utils.teams.byId.invalidate({ id: teamId });
      setLinkOpen(false);
      setSelectedCommunityId(null);
    },
    onError: (error) => {
      setLinkError(error.message);
      toast.show(error.message);
    },
  });

  const unlink = api.teams.unlink.useMutation({
    onSuccess: async (result) => {
      toast.show(TEAM_UNLINKED_TOAST);
      await Promise.all([
        utils.teams.byId.invalidate({ id: teamId }),
        utils.teams.mine.invalidate(),
        result.communityId
          ? utils.communities.byId.invalidate({ id: result.communityId })
          : Promise.resolve(),
        utils.communities.mine.invalidate(),
      ]);
    },
    onError: (error) => {
      setActionError(error.message);
      toast.show(error.message);
    },
    onSettled: () => setConfirm(null),
  });

  const dissolve = api.teams.dissolve.useMutation({
    onSuccess: async () => {
      toast.show(TEAM_DISSOLVED_TOAST);
      await utils.teams.mine.invalidate();
      router.replace(TEAMS_PATH);
    },
    onError: (error) => {
      setActionError(error.message);
      toast.show(error.message);
    },
    onSettled: () => setConfirm(null),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await team.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [team]);

  const view = data ? teamHomeView(data) : null;
  const title = view?.title ?? "Team";
  const header = (
    <Stack.Screen
      options={{
        title,
        headerTitle: () => <Text weight="semibold">{title}</Text>,
      }}
    />
  );

  if (isNotFoundError(team.error)) {
    return (
      <Screen>
        {header}
        <Notice {...TEAM_NOT_FOUND_COPY} />
      </Screen>
    );
  }

  if (isForbiddenError(team.error)) {
    return (
      <Screen>
        {header}
        <Notice {...TEAM_FORBIDDEN_COPY} />
      </Screen>
    );
  }

  if (team.error && !data) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <Notice
          alert
          title={TEAM_ERROR_TITLE}
          description={team.error.message}
          onRetry={() => void team.refetch()}
        />
      </Screen>
    );
  }

  if (!data || !view) {
    return (
      <Screen>
        {header}
        <Skeleton height={72} radius={16} />
        <Skeleton height={96} radius={16} />
        <Skeleton height={160} radius={16} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      {header}
      <TeamHomeView
        view={view}
        linkOpen={linkOpen}
        linkPicker={linkPicker}
        linkPickerMessage={communities.error?.message ?? null}
        selectedCommunityId={selectedCommunityId}
        linkError={linkError}
        linkPending={requestLink.isPending}
        confirm={confirm}
        confirmPending={unlink.isPending || dissolve.isPending}
        actionError={actionError}
        onInvite={() => setInviteOpen(true)}
        onOpenLink={() => {
          setLinkError(null);
          setLinkOpen(true);
        }}
        onCloseLink={() => setLinkOpen(false)}
        onSelectCommunity={setSelectedCommunityId}
        onSubmitLink={() => {
          if (selectedCommunityId) {
            setLinkError(null);
            requestLink.mutate({ teamId, communityId: selectedCommunityId });
          }
        }}
        onRetryCommunities={() => void communities.refetch()}
        onUnlink={() => {
          setActionError(null);
          setConfirm({
            ...teamUnlinkConfirm(view.title),
            onConfirm: () => unlink.mutate({ teamId }),
          });
        }}
        onDissolve={() => {
          setActionError(null);
          setConfirm({
            ...teamDissolveConfirm(view.title),
            onConfirm: () => dissolve.mutate({ teamId }),
          });
        }}
        onCloseConfirm={() => setConfirm(null)}
      />
      {data.canInvite ? (
        <InviteDoorSheet
          visible={inviteOpen}
          onClose={() => setInviteOpen(false)}
          door={{
            kind: "team",
            teamId,
            unusedInvite: data.unusedInvite
              ? {
                  id: data.unusedInvite.id,
                  user: data.unusedInvite.user,
                }
              : null,
            canLookup: true,
            canLink: true,
          }}
        />
      ) : null}
    </Screen>
  );
}
