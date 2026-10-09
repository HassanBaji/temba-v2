import { useAuth, useUser } from "@clerk/expo";
import { RECENT_FORM_MATCH_COUNT } from "@repo/domain/home-recent-form";
import type { PreferredPosition } from "@repo/domain/preferred-position";
import * as ImagePicker from "expo-image-picker";
import { useRouter, type Href } from "expo-router";
import { useCallback, useState } from "react";

import { recentFormFromHistory } from "../home/home-model";
import { splitTrpcFormError } from "../lib/form-error";
import { slotOf } from "../lib/slot-of";
import { Screen } from "../primitives/screen";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { imageDataUri, photoErrorMessage } from "./photo";
import {
  allTimeFromApi,
  levelFromApi,
  positionFromApi,
  type ProfileModel,
} from "./profile-model";
import { ProfileView } from "./profile-view";
import type { ProfileDestination } from "./settings";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const [refreshing, setRefreshing] = useState(false);
  const [changingPhoto, setChangingPhoto] = useState(false);
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
    name: user?.fullName ?? user?.firstName ?? user?.username ?? "You",
    imageUri: user?.hasImage ? user.imageUrl : null,
    position,
    level: slotOf({
      data: rating.data ? levelFromApi(rating.data) : undefined,
      error: rating.error,
      isLoading: rating.isLoading,
    }),
    recentForm: slotOf({
      data: history.data ? recentFormFromHistory(history.data) : undefined,
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
    if (!user) {
      return;
    }
    setChangingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) {
        return;
      }
      if (!asset.base64) {
        toast.show("That photo could not be read. Try another one.");
        return;
      }
      await user.setProfileImage({
        file: imageDataUri(asset.base64, asset.mimeType),
      });
      await user.reload();
    } catch (error) {
      toast.show(photoErrorMessage(error));
    } finally {
      setChangingPhoto(false);
    }
  }, [user, toast]);

  const onOpen = useCallback(
    (destination: ProfileDestination) =>
      router.push(`/profile/${destination}` as Href),
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
