import { useAuth, useUser } from "@clerk/expo";
import { RECENT_FORM_MATCH_COUNT } from "@repo/domain/home-recent-form";
import type { PreferredPosition } from "@repo/domain/preferred-position";
import { useRouter, type Href } from "expo-router";
import { useCallback, useState } from "react";

import { recentFormFromHistory } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { splitTrpcFormError } from "../lib/form-error";
import { slotOf } from "../lib/slot-of";
import { Screen } from "../primitives/screen";
import { useToast } from "../primitives/toast";
import { checklistFrom } from "../profile-tasks/profile-tasks-model";
import { api } from "../trpc/react";
import {
  allTimeFromApi,
  levelFromApi,
  positionFromApi,
  profileDestinationPath,
  type ProfileDestination,
  type ProfileModel,
} from "./profile-model";
import { ProfileView } from "./profile-view";
import { useProfilePhoto } from "./use-profile-photo";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export function ProfileScreen() {
  const m = useMessages();
  const locale = useLocale();
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const { pickPhoto, savePhoto, pending: changingPhoto } = useProfilePhoto();
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [optimistic, setOptimistic] = useState<PreferredPosition | undefined>();

  const rating = api.ratings.me.useQuery(undefined, REFETCH_ON_FOREGROUND);
  const stats = api.users.profileStats.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const history = api.games.listMyMatchHistory.useQuery(
    { limit: RECENT_FORM_MATCH_COUNT },
    REFETCH_ON_FOREGROUND,
  );
  const onboarding = api.users.onboardingState.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const teams = api.teams.mine.useQuery(undefined, REFETCH_ON_FOREGROUND);
  const communityInvites = api.communities.pendingLookupInvites.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const groupInvites = api.groups.pendingLookupInvites.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const teamInvites = api.teams.pendingInvites.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );

  const setPreferredPosition = api.users.setPreferredPosition.useMutation({
    onMutate: ({ preferredPosition }) => setOptimistic(preferredPosition),
    onSuccess: async () => {
      await utils.users.onboardingState.invalidate();
      setOptimistic(undefined);
    },
    onError: (error) => {
      setOptimistic(undefined);
      toast.show(splitTrpcFormError(error).globalMessage ?? error.message);
    },
  });

  const position = slotOf({
    data: onboarding.data ? positionFromApi(onboarding.data) : undefined,
    error: onboarding.error,
    isLoading: onboarding.isLoading,
  });
  const selectedPosition =
    optimistic ??
    (position.status === "ready" ? position.value.position : null);

  const model: ProfileModel = {
    name: user?.fullName ?? user?.firstName ?? user?.username ?? m.common.you,
    imageUri: user?.hasImage ? user.imageUrl : null,
    position,
    level: slotOf({
      data: rating.data ? levelFromApi(rating.data) : undefined,
      error: rating.error,
      isLoading: rating.isLoading,
    }),
    recentForm: slotOf({
      data: history.data
        ? recentFormFromHistory(history.data, locale)
        : undefined,
      error: history.error,
      isLoading: history.isLoading,
    }),
    allTime: slotOf({
      data: stats.data ? allTimeFromApi(stats.data) : undefined,
      error: stats.error,
      isLoading: stats.isLoading,
    }),
    pendingInviteCount:
      (communityInvites.data?.length ?? 0) +
      (groupInvites.data?.length ?? 0) +
      (teamInvites.data?.length ?? 0),
    teamCount: teams.data?.length ?? 0,
    checklistIncomplete:
      checklistFrom(user, onboarding.data, locale)?.complete === false,
  };

  const refetchAll = useCallback(
    () =>
      Promise.all([
        rating.refetch(),
        stats.refetch(),
        history.refetch(),
        onboarding.refetch(),
        teams.refetch(),
        communityInvites.refetch(),
        groupInvites.refetch(),
        teamInvites.refetch(),
        user?.reload(),
      ]),
    [
      rating,
      stats,
      history,
      onboarding,
      teams,
      communityInvites,
      groupInvites,
      teamInvites,
      user,
    ],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [refetchAll]);

  const changePhoto = useCallback(async () => {
    const picked = await pickPhoto("library");
    if (!picked.ok) {
      toast.show(picked.message);
      return;
    }
    if (!picked.value) {
      return;
    }
    const saved = await savePhoto(picked.value);
    if (!saved.ok) {
      toast.show(saved.message);
    }
  }, [pickPhoto, savePhoto, toast]);

  const onOpen = useCallback(
    (destination: ProfileDestination) =>
      router.push(profileDestinationPath(destination) as Href),
    [router],
  );

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <ProfileView
        model={model}
        selectedPosition={selectedPosition}
        savingPosition={setPreferredPosition.isPending}
        changingPhoto={changingPhoto}
        signingOut={signingOut}
        onChangePhoto={() => void changePhoto()}
        onSelectPosition={(preferredPosition) => {
          if (preferredPosition !== selectedPosition) {
            setPreferredPosition.mutate({ preferredPosition });
          }
        }}
        onOpen={onOpen}
        onSignOut={() => {
          setSigningOut(true);
          signOut().catch(() => setSigningOut(false));
        }}
        onRetry={() => void refetchAll()}
      />
    </Screen>
  );
}
