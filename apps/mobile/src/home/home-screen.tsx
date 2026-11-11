import { useUser } from "@clerk/expo";
import { formatDayMonth } from "@repo/domain/format-game-start";
import { RECENT_FORM_MATCH_COUNT } from "@repo/domain/home-recent-form";
import { homeNoGamesCreateAction } from "@repo/domain/home-no-games";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import type { Sport } from "@repo/domain/sport";
import { useRouter, type Href } from "expo-router";
import { useCallback, useState } from "react";

import { useNow } from "../games/use-now";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Screen } from "../primitives/screen";
import { checklistFrom } from "../profile-tasks/profile-tasks-model";
import { api } from "../trpc/react";
import {
  homeChecklist,
  homeSport,
  homeSports,
  levelFromApi,
  recentFormFromHistory,
  standingInSport,
  statsFromProfile,
  type HomeModel,
  type Slot,
} from "./home-model";
import { homePath, type HomeNavTarget } from "./home-target";
import { HomeView } from "./home-view";
import { latestMark } from "./latest-model";
import { openWeekRows, upNextItems } from "./up-next-model";
import { useChecklistSkipped } from "./use-checklist-skipped";
import { useLatestSeen } from "./use-latest-seen";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };
const UP_NEXT_BOOKING_LIMIT = 20;

function slotOf<T, U>(
  query: {
    data: T | undefined;
    error: { message: string } | null;
    isLoading: boolean;
  },
  map: (data: T) => U,
): Slot<U> {
  if (query.error) {
    return { status: "error", message: query.error.message };
  }
  if (query.data === undefined || query.isLoading) {
    return { status: "loading" };
  }
  return { status: "ready", value: map(query.data) };
}

type RatingData = { rating: { levelBand: string } | null } | undefined;

function bandOf(data: RatingData): string | null {
  return data?.rating
    ? displayLabelFromStoredBand(
        data.rating.levelBand as Parameters<
          typeof displayLabelFromStoredBand
        >[0],
      )
    : null;
}

export function HomeScreen() {
  const m = useMessages();
  const locale = useLocale();
  const now = useNow();
  const { user } = useUser();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [chosenSport, setChosenSport] = useState<Sport | null>(null);
  const { skipped, setChecklistSkipped } = useChecklistSkipped();
  const { seen, ready: seenReady, markSeen } = useLatestSeen();

  const home = api.users.home.useQuery(undefined, REFETCH_ON_FOREGROUND);
  const onboarding = api.users.onboardingState.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const details = api.users.profileDetails.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const bookings = api.bookings.listMine.useQuery(
    { scope: "upcoming", limit: UP_NEXT_BOOKING_LIMIT },
    REFETCH_ON_FOREGROUND,
  );
  const createGroups = api.games.listCreateGroups.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );

  const upNextSource = {
    data:
      home.data && bookings.data
        ? { games: home.data.carouselGames, bookings: bookings.data.items }
        : undefined,
    error: home.error ?? bookings.error,
    isLoading: home.isLoading || bookings.isLoading,
  };
  const upNext = slotOf(upNextSource, (data) =>
    upNextItems(data.games, data.bookings),
  );
  const nextSport =
    upNext.status === "ready" ? (upNext.value[0]?.sport ?? null) : null;

  const sports = homeSports(onboarding.data?.sports);
  const sport = homeSport(chosenSport, sports, nextSport);
  const twoSports = sports.length > 1;

  const padelRating = api.ratings.me.useQuery(
    { sport: "padel" },
    { ...REFETCH_ON_FOREGROUND, enabled: sports.includes("padel") },
  );
  const footballRating = api.ratings.me.useQuery(
    { sport: "football" },
    { ...REFETCH_ON_FOREGROUND, enabled: sports.includes("football") },
  );
  const rating = sport === "football" ? footballRating : padelRating;
  const history = api.games.listMyMatchHistory.useQuery(
    { limit: RECENT_FORM_MATCH_COUNT, sport },
    REFETCH_ON_FOREGROUND,
  );
  const profile = api.users.myProfile.useQuery(
    { sport },
    REFETCH_ON_FOREGROUND,
  );
  const cabinet = api.marks.cabinet.useQuery(
    { userId: details.data?.id ?? "" },
    { ...REFETCH_ON_FOREGROUND, enabled: !!details.data },
  );

  const nothingNext = upNext.status === "ready" && upNext.value.length === 0;
  const myGames = api.games.listMyGames.useQuery(undefined, {
    enabled: nothingNext,
  });

  const latest = seenReady
    ? latestMark(cabinet.data, sports, now, locale)
    : null;

  const model: HomeModel = {
    name: user?.fullName ?? user?.firstName ?? user?.username ?? m.common.you,
    imageUri: user?.imageUrl ?? null,
    pendingInviteCount: home.data?.pendingInviteCount ?? 0,
    checklist: homeChecklist(
      checklistFrom(user, onboarding.data, locale),
      skipped,
    ),
    upNext,
    noGamesAction: homeNoGamesCreateAction({
      createGroupCount: createGroups.data?.length,
      locale,
    }),
    openGames: myGames.data ? openWeekRows(myGames.data, now, locale) : [],
    latest: latest && latest.key !== seen ? latest : null,
    dateLine: formatDayMonth(now, locale, { weekday: "long", month: "long" }),
    sports: twoSports ? sports : [sport],
    sport,
    bands: twoSports
      ? {
          padel: bandOf(padelRating.data),
          football: bandOf(footballRating.data),
        }
      : {},
    level: slotOf(rating, levelFromApi),
    recentForm: slotOf(history, (rows) => recentFormFromHistory(rows, locale)),
    stats: slotOf(profile, (data) => statsFromProfile(data, locale)),
    standing: slotOf(home, (data) => standingInSport(data.standing, sport)),
  };

  const refetchAll = useCallback(
    () =>
      Promise.all([
        home.refetch(),
        bookings.refetch(),
        padelRating.refetch(),
        footballRating.refetch(),
        history.refetch(),
        profile.refetch(),
        cabinet.refetch(),
        createGroups.refetch(),
        onboarding.refetch(),
        details.refetch(),
        user?.reload(),
      ]),
    [
      home,
      bookings,
      padelRating,
      footballRating,
      history,
      profile,
      cabinet,
      createGroups,
      onboarding,
      details,
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

  const onNavigate = useCallback(
    (target: HomeNavTarget) => router.push(homePath(target) as Href),
    [router],
  );

  const onOpenLatest = useCallback(() => {
    if (!latest || !details.data) {
      return;
    }
    markSeen(latest.key);
    onNavigate({ kind: "marks", userId: details.data.id, sport: latest.sport });
  }, [latest, details.data, markSeen, onNavigate]);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <HomeView
        model={model}
        onNavigate={onNavigate}
        onSport={setChosenSport}
        onOpenLatest={onOpenLatest}
        onRetry={() => void refetchAll()}
        onSkipChecklist={() => setChecklistSkipped(true)}
        onShowChecklist={() => setChecklistSkipped(false)}
      />
    </Screen>
  );
}
