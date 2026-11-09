import { isForbiddenError } from "@repo/domain/is-forbidden-error";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { sportOrDefault } from "@repo/domain/sport";
import { teamDetailView } from "@repo/domain/team-detail";
import {
  teamDissolveConfirm,
  teamLeaveConfirm,
  teamRemoveImageConfirm,
} from "@repo/domain/teams";
import { useRouter, useSegments } from "expo-router";
import { useCallback, useState } from "react";
import { Share } from "react-native";

import type { ConfirmRequest } from "../game-details/confirm-sheet";
import { gamePath } from "../games/games-model";
import { Notice } from "../groups/notice";
import { pickGroupImage } from "../groups/pick-group-image";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { InviteDoorSheet } from "../invites/invite-door-sheet";
import { playerPath } from "../player-profile/player-path";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { useToast } from "../primitives/toast";
import { rematchPath } from "../challenges/challenges-model";
import { groupPath } from "../groups/groups-model";
import { api } from "../trpc/react";
import { TEAMS_PATH, postChallengePath, teamPath } from "./teams-model";
import { TeamAddPlayersSheet } from "./team-add-players-sheet";
import { TeamDetailBody, TeamHero, type TeamMenuItem } from "./team-home-view";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export function TeamHomeScreen({ teamId }: { teamId: string }) {
  const router = useRouter();
  const segments = useSegments();
  const toast = useToast();
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const [now] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const team = api.teams.byId.useQuery({ id: teamId }, REFETCH_ON_FOREGROUND);
  const data = team.data;
  const organized = api.games.listCreateGroups.useQuery(undefined, {
    enabled: addOpen,
  });

  const removeUnclaimed = api.teams.removeUnclaimedPlayer.useMutation({
    onError: (error) => {
      setActionError(error.message);
      toast.show(error.message);
    },
    onSettled: () => setConfirm(null),
  });

  const dissolve = api.teams.dissolve.useMutation({
    onSuccess: async () => {
      toast.show(m.team.toast.dissolved);
      await utils.teams.mine.invalidate();
      router.replace(TEAMS_PATH);
    },
    onError: (error) => {
      setActionError(error.message);
      toast.show(error.message);
    },
    onSettled: () => setConfirm(null),
  });

  const leave = api.teams.leave.useMutation({
    onSuccess: async () => {
      toast.show(m.team.toast.left);
      await utils.teams.mine.invalidate();
      router.replace(TEAMS_PATH);
    },
    onError: (error) => {
      setActionError(error.message);
      toast.show(error.message);
    },
    onSettled: () => setConfirm(null),
  });

  const setGroupTag = api.teams.setGroupTag.useMutation({
    onError: (error) => {
      setActionError(error.message);
      toast.show(error.message);
    },
  });

  function changeGroupTag(groupId: string | null, message: string) {
    setActionError(null);
    setGroupTag.mutate(
      { teamId, groupId },
      {
        onSuccess: () => {
          toast.show(message);
          void utils.teams.byId.invalidate({ id: teamId });
          void utils.groups.byId.invalidate();
        },
      },
    );
  }

  const refreshTeamImage = () =>
    Promise.all([
      utils.teams.byId.invalidate({ id: teamId }),
      utils.teams.mine.invalidate(),
    ]);

  const uploadImage = api.teams.uploadImage.useMutation({
    onSuccess: async () => {
      toast.show(m.team.image.savedToast);
      await refreshTeamImage();
    },
    onError: (error) => {
      setActionError(error.message);
      toast.show(error.message);
    },
  });

  const clearImage = api.teams.clearImage.useMutation({
    onSuccess: async () => {
      toast.show(m.team.image.removedToast);
      await refreshTeamImage();
    },
    onError: (error) => {
      setActionError(error.message);
      toast.show(error.message);
    },
    onSettled: () => setConfirm(null),
  });

  async function changeImage() {
    if (uploadImage.isPending) {
      return;
    }
    setActionError(null);
    const picked = await pickGroupImage(locale);
    if (!picked) {
      return;
    }
    if (!picked.image.ok) {
      toast.show(picked.image.error);
      return;
    }
    uploadImage.mutate({
      teamId,
      contentType: picked.image.contentType,
      dataBase64: picked.image.dataBase64,
    });
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await team.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [team]);

  const detail = data ? teamDetailView(data, now, locale) : null;
  const header = <ScreenHeader nav="back" fallback={TEAMS_PATH} />;

  if (isNotFoundError(team.error)) {
    return (
      <Screen>
        {header}
        <Notice {...m.team.notFound} />
      </Screen>
    );
  }

  if (isForbiddenError(team.error)) {
    return (
      <Screen>
        {header}
        <Notice {...m.team.forbidden} />
      </Screen>
    );
  }

  if (team.error && !data) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <Notice
          alert
          title={m.team.teamErrorTitle}
          description={team.error.message}
          onRetry={() => void team.refetch()}
        />
      </Screen>
    );
  }

  if (!data || !detail) {
    return (
      <Screen>
        {header}
        <Skeleton height={72} radius={16} />
        <Skeleton height={96} radius={16} />
        <Skeleton height={160} radius={16} />
      </Screen>
    );
  }

  const view = detail.home;
  const groupTag = data.groupTag;
  const menuCandidates: (TeamMenuItem | null)[] = [
    groupTag && detail.openGroupLabel
      ? {
          key: "group",
          label: detail.openGroupLabel,
          onPress: () => router.push(groupPath(groupTag.id)),
        }
      : null,
    view.canInvite
      ? {
          key: "invite",
          label: view.inviteLabel,
          onPress: () => setInviteOpen(true),
        }
      : null,
    data.canManageImage
      ? {
          key: "image",
          label: m.team.image.change,
          disabled: uploadImage.isPending || clearImage.isPending,
          onPress: () => void changeImage(),
        }
      : null,
    data.canManageImage && data.imageUrl
      ? {
          key: "image-remove",
          label: m.team.image.remove,
          disabled: uploadImage.isPending || clearImage.isPending,
          onPress: () => {
            setActionError(null);
            setConfirm({
              ...teamRemoveImageConfirm(view.title, locale),
              onConfirm: () => clearImage.mutate({ teamId }),
            });
          },
        }
      : null,
    ...view.groupTag.options.map((option) => ({
      key: `tag-${option.groupId}`,
      label: option.label,
      disabled: setGroupTag.isPending,
      onPress: () => changeGroupTag(option.groupId, option.toast),
    })),
    view.groupTag.remove
      ? {
          key: "untag",
          label: view.groupTag.remove.label,
          disabled: setGroupTag.isPending,
          onPress: () => {
            if (view.groupTag.remove) {
              changeGroupTag(null, view.groupTag.remove.toast);
            }
          },
        }
      : null,
    view.canLeave
      ? {
          key: "leave",
          label: m.team.leaveLabel,
          tone: "danger" as const,
          onPress: () => {
            setActionError(null);
            setConfirm({
              ...teamLeaveConfirm(view.title, locale),
              onConfirm: () => leave.mutate({ teamId }),
            });
          },
        }
      : null,
    view.canDissolve
      ? {
          key: "dissolve",
          label: m.team.dissolveLabel,
          tone: "danger" as const,
          onPress: () => {
            setActionError(null);
            setConfirm({
              ...teamDissolveConfirm(view.title, locale),
              onConfirm: () => dissolve.mutate({ teamId }),
            });
          },
        }
      : null,
  ];
  const menuItems = menuCandidates.filter(
    (item): item is TeamMenuItem => item != null,
  );

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      statusBarTone="ink"
      header={
        <TeamHero
          hero={detail.hero}
          imagePending={uploadImage.isPending}
          onMenu={menuItems.length > 0 ? () => setMenuOpen(true) : null}
          onPost={() => router.push(postChallengePath(teamId))}
          onInvite={() => setInviteOpen(true)}
          onShare={() => {
            if (detail.hero.share) {
              void Share.share({ message: detail.hero.share.text });
            }
          }}
        />
      }
    >
      <TeamDetailBody
        detail={detail}
        formTitle={m.team.form.title}
        rivalsTitle={m.team.rivals.title}
        gamesTitle={m.team.games.title}
        actionError={actionError}
        confirm={confirm}
        confirmPending={
          dissolve.isPending ||
          leave.isPending ||
          removeUnclaimed.isPending ||
          clearImage.isPending
        }
        menu={{
          visible: menuOpen,
          items: menuItems,
          onClose: () => setMenuOpen(false),
        }}
        onOpenTeam={(id) => router.push(teamPath(id))}
        onRematch={(opponentTeamId) =>
          router.push(rematchPath(teamId, opponentTeamId))
        }
        onOpenPlayer={(userId) => router.push(playerPath(segments, userId))}
        onOpenGame={(gameId) => router.push(gamePath(gameId))}
        onOpenSeat={() => {
          if (detail.members.openSeat?.action === "add") {
            setAddOpen(true);
          } else {
            setInviteOpen(true);
          }
        }}
        onRemoveMember={(remove) => {
          setActionError(null);
          setConfirm({
            ...remove.confirm,
            onConfirm: () =>
              removeUnclaimed.mutate(
                { teamId, userId: remove.userId },
                {
                  onSuccess: () => {
                    toast.show(remove.toast);
                    void utils.teams.byId.invalidate({ id: teamId });
                  },
                },
              ),
          });
        }}
        onCloseConfirm={() => setConfirm(null)}
      />
      {data.canInvite ? (
        <TeamAddPlayersSheet
          visible={addOpen}
          onClose={() => setAddOpen(false)}
          sport={data.sport}
          spotsLeft={Math.max(0, data.roster.max - data.roster.count)}
          groups={(organized.data ?? []).filter(
            (group) => group.sport === sportOrDefault(data.sport),
          )}
          target={{
            kind: "team",
            teamId,
            onChanged: () =>
              Promise.all([
                utils.teams.byId.invalidate({ id: teamId }),
                utils.teams.listInAppInvites.invalidate({ teamId }),
              ]),
          }}
        />
      ) : null}
      {data.canInvite ? (
        <InviteDoorSheet
          visible={inviteOpen}
          onClose={() => setInviteOpen(false)}
          door={{
            kind: "team",
            teamId,
            squad: view.squad,
            canLookup: true,
            canLink: true,
          }}
        />
      ) : null}
    </Screen>
  );
}
