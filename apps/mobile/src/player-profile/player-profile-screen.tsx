import {
  playerProfileRefused,
  profileSport,
} from "@repo/domain/player-profile";
import { sportSwitchView } from "@repo/domain/player-profile-page";
import type { Sport } from "@repo/domain/sport";
import {
  useLocalSearchParams,
  useRouter,
  useSegments,
  type Href,
} from "expo-router";
import { useCallback, useState } from "react";

import { gamePath } from "../games/games-model";
import { groupPath } from "../groups/groups-model";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { apiOrigin } from "../lib/api-origin-runtime";
import { Button } from "../primitives/button";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { api } from "../trpc/react";
import { cabinetRowModel } from "../marks/cabinet-model";
import {
  playerCalibratePath,
  playerMarksPath,
  playerMatchesPath,
  playerPath,
} from "./player-path";
import {
  footballProfileState,
  playerProfileState,
  sharedTierView,
  type ProfileMatchRow,
} from "./player-profile-model";
import { PlayerProfileBody } from "./player-profile-view";
import { ProfileHero } from "./profile-hero";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };
const FALLBACK: Href = "/";

export function PlayerProfileScreen({
  userId,
  requestedSport,
}: {
  userId: string;
  requestedSport?: string;
}) {
  const router = useRouter();
  const segments = useSegments();
  const locale = useLocale();
  const m = useMessages();
  const [refreshing, setRefreshing] = useState(false);
  const [chosen, setChosen] = useState<Sport | null>(null);
  const padelQuery = api.users.playerProfile.useQuery(
    { userId },
    REFETCH_ON_FOREGROUND,
  );
  const sports = padelQuery.data?.sports;
  const sport = chosen ?? profileSport(requestedSport, sports);
  // Loaded for the switch's game count too, not only once football is picked.
  const footballEnabled =
    sport === "football" || (sports?.includes("football") ?? false);
  const footballQuery = api.users.footballProfile.useQuery(
    { userId },
    { ...REFETCH_ON_FOREGROUND, enabled: footballEnabled },
  );
  const cabinetQuery = api.marks.cabinet.useQuery(
    { userId },
    REFETCH_ON_FOREGROUND,
  );
  const query = sport === "football" ? footballQuery : padelQuery;
  const state =
    sport === "football"
      ? footballProfileState(footballQuery, apiOrigin, locale)
      : playerProfileState(padelQuery, apiOrigin, locale);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        padelQuery.refetch(),
        footballEnabled ? footballQuery.refetch() : null,
        cabinetQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [padelQuery, footballQuery, footballEnabled, cabinetQuery]);

  const header = <ScreenHeader nav="back" fallback={FALLBACK} />;

  if (state.status === "refused") {
    return (
      <Screen>
        {header}
        <Notice {...playerProfileRefused(locale)} />
      </Screen>
    );
  }

  if (state.status === "error") {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <Notice
          alert
          title={m.mobilePlayer.profile.loadError}
          description={state.message}
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  if (state.status === "loading" || !sport) {
    return (
      <Screen>
        {header}
        <Skeleton height={360} radius={16} />
        <Skeleton height={180} radius={16} />
      </Screen>
    );
  }

  const model = state.model;
  const played = (entry: Sport) =>
    (entry === "football" ? footballQuery.data : padelQuery.data)?.overall
      .played ?? null;
  const switchOptions = sportSwitchView(
    model.sports.map((entry) => ({ sport: entry, played: played(entry) })),
    sport,
    locale,
  );

  const onOpenRow = (target: NonNullable<ProfileMatchRow["target"]>) => {
    router.push(
      target.kind === "game"
        ? gamePath(target.gameId)
        : playerMatchesPath(segments, userId, target.matchId),
    );
  };

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      statusBarTone="ink"
      header={
        <ProfileHero
          name={model.name}
          imageUri={model.imageUri}
          subtitle={model.subtitle}
          switchOptions={switchOptions}
          onSelectSport={setChosen}
          level={model.level}
          fallback={FALLBACK}
        />
      }
    >
      {padelQuery.data?.viewerMayCalibrate ? (
        <Button
          label={m.rating.verifier.calibrate.action}
          variant="outline"
          onPress={() =>
            router.push(playerCalibratePath(segments, userId, sport))
          }
        />
      ) : null}
      <PlayerProfileBody
        model={model}
        cabinet={cabinetRowModel(cabinetQuery.data, sport, locale)}
        tier={sharedTierView(sport, padelQuery.data, locale)}
        onOpenCabinet={() =>
          router.push(playerMarksPath(segments, userId, sport))
        }
        onOpenGroup={(groupId) => router.push(groupPath(groupId))}
        onOpenRow={onOpenRow}
        onOpenPlayer={(playerId) =>
          router.push(playerPath(segments, playerId, sport))
        }
        onSeeAll={() => router.push(playerMatchesPath(segments, userId))}
      />
    </Screen>
  );
}

export function PlayerProfileRoute() {
  const { userId, sport } = useLocalSearchParams<{
    userId: string;
    sport?: string;
  }>();
  return <PlayerProfileScreen userId={userId} requestedSport={sport} />;
}
