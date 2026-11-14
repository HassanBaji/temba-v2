"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { HomeBlock } from "~/components/home/home-block";
import { HomeHeader } from "~/components/home/home-header";
import { HomeRequests } from "~/components/home/home-requests";
import { ProfileChecklistCard } from "~/components/home/profile-checklist-card";
import {
  levelFromApi,
  slotOf,
  standingInSport,
} from "~/components/home/home-model";
import { HomeStanding } from "~/components/home/home-standing";
import { LatestRow } from "~/components/home/latest-row";
import { LevelCard } from "~/components/home/level-card";
import { RecentFormCard } from "~/components/home/recent-form-card";
import { TrendCard } from "~/components/home/trend-card";
import { SportSwitch } from "~/components/home/sport-switch";
import { StatsCard } from "~/components/home/stats-card";
import { UpNextCard } from "~/components/home/up-next-card";
import {
  UpNextEmpty,
  UpNextHeading,
  UpNextList,
} from "~/components/home/up-next";
import { upNextItems, upNextWeekLabel } from "~/components/home/up-next-model";
import { useLatestSeen } from "~/components/home/use-latest-seen";
import { formatDayMonth } from "@repo/domain/format-game-start";
import { latestMark } from "@repo/domain/home-latest";
import {
  deriveRecentForm,
  RECENT_FORM_MATCH_COUNT,
} from "@repo/domain/home-recent-form";
import { homeNoGamesCreateAction } from "@repo/domain/home-no-games";
import { openWeekRows } from "@repo/domain/home-open-week";
import { homeSport, homeSports } from "@repo/domain/home-sports";
import { homeStats } from "@repo/domain/home-stats";
import { profileChecklist } from "@repo/domain/profile-checklist";
import { sportSwitchLevel } from "@repo/domain/ratings-screen";
import type { Sport } from "@repo/domain/sport";
import { useNow } from "~/hooks/use-now";
import { playerMarksPath } from "~/lib/dashboard-paths";
import { profileChecklistInputFrom } from "~/lib/profile-checklist-input";
import { api } from "~/trpc/react";

export default function HomePage() {
  const { user } = useUser();
  const m = useMessages();
  const locale = useLocale();
  const now = useNow();
  const [chosenSport, setChosenSport] = useState<Sport | null>(null);
  const { seen, ready: seenReady, markSeen } = useLatestSeen();

  const home = api.users.home.useQuery();
  const onboarding = api.users.onboardingState.useQuery();
  const details = api.users.profileDetails.useQuery();
  const createGroups = api.games.listCreateGroups.useQuery();

  const upNext = slotOf(home, (data) => upNextItems(data.carouselGames));
  const nextSport =
    upNext.status === "ready" ? (upNext.value[0]?.sport ?? null) : null;
  const sports = homeSports(onboarding.data?.sports);
  const sport = homeSport(chosenSport, sports, nextSport);
  const twoSports = sports.length > 1;

  const padelRating = api.ratings.me.useQuery(
    { sport: "padel" },
    { enabled: sports.includes("padel") },
  );
  const footballRating = api.ratings.me.useQuery(
    { sport: "football" },
    { enabled: sports.includes("football") },
  );
  const rating = sport === "football" ? footballRating : padelRating;
  const history = api.games.listMyMatchHistory.useQuery({
    limit: RECENT_FORM_MATCH_COUNT,
    sport,
  });
  const profile = api.users.myProfile.useQuery({ sport });
  const cabinet = api.marks.cabinet.useQuery(
    { userId: details.data?.id ?? "" },
    { enabled: !!details.data },
  );
  const nothingNext = upNext.status === "ready" && upNext.value.length === 0;
  const myGames = api.games.listMyGames.useQuery(undefined, {
    enabled: nothingNext,
  });

  const name =
    user?.fullName ?? user?.firstName ?? user?.username ?? m.common.you;
  const checklist =
    user && onboarding.data && !onboarding.data.provisioning
      ? profileChecklist(
          profileChecklistInputFrom(
            user,
            onboarding.data.onboardingCompletedAt,
          ),
          locale,
        )
      : null;
  const level = slotOf(rating, levelFromApi);
  const recentForm = slotOf(history, (rows) => deriveRecentForm(rows, locale));
  const stats = slotOf(profile, (data) => homeStats(data, locale));
  const createAction = homeNoGamesCreateAction({
    createGroupCount: createGroups.data?.length,
    locale,
  });
  const openGames = myGames.data ? openWeekRows(myGames.data, now, locale) : [];
  const newest = seenReady
    ? latestMark(cabinet.data, sports, now, locale)
    : null;
  const latest = newest && newest.key !== seen ? newest : null;

  return (
    <DashboardShell width="content" hidePageHeader={true} hideMobileTopBar>
      <div className="mt-6 flex w-full min-w-0 flex-col gap-[26px] lg:mt-2">
        <h1 className="sr-only">{m.common.home}</h1>
        <HomeHeader
          name={name}
          dateLine={formatDayMonth(now, locale, {
            weekday: "long",
            month: "long",
          })}
          image={user?.imageUrl}
        />

        <HomeRequests />

        {checklist ? <ProfileChecklistCard list={checklist} /> : null}

        <section className="flex flex-col gap-3">
          <UpNextHeading
            label={
              upNext.status === "ready"
                ? upNextWeekLabel(upNext.value, now, locale)
                : ""
            }
          />
          <HomeBlock
            slot={upNext}
            title={m.webDashboard.home.upNext}
            skeletonHeight={420}
            onRetry={() => void home.refetch()}
          >
            {([next, ...rest]) =>
              next ? (
                <div className="flex flex-col gap-2.5">
                  <UpNextCard item={next} />
                  <UpNextList items={rest} />
                </div>
              ) : (
                <UpNextEmpty
                  openGames={openGames}
                  createAction={createAction}
                />
              )
            }
          </HomeBlock>
        </section>

        {latest && details.data ? (
          <LatestRow
            latest={latest}
            href={playerMarksPath(details.data.id, latest.sport)}
            onOpen={() => markSeen(latest.key)}
          />
        ) : null}

        {twoSports ? (
          <SportSwitch
            sports={sports}
            value={sport}
            levels={{
              padel: sportSwitchLevel("padel", padelRating.data, locale),
              football: sportSwitchLevel(
                "football",
                footballRating.data,
                locale,
              ),
            }}
            onSelect={setChosenSport}
          />
        ) : null}

        <div
          role="region"
          aria-label={m.webDashboard.home.yourSport}
          className="flex flex-col gap-[26px]"
        >
          <HomeBlock
            slot={level}
            title={m.home.levelSection.title[sport]}
            skeletonHeight={220}
            onRetry={() => void rating.refetch()}
          >
            {(value) => <LevelCard level={value} sport={sport} />}
          </HomeBlock>
          {level.status === "ready" && level.value.kind === "rated" ? (
            <TrendCard input={level.value.input} />
          ) : null}
          <HomeBlock
            slot={recentForm}
            title={m.home.lastTen.title}
            skeletonHeight={160}
            onRetry={() => void history.refetch()}
          >
            {(form) =>
              form.playedCount > 0 ? <RecentFormCard form={form} /> : null
            }
          </HomeBlock>
          <HomeBlock
            slot={stats}
            title={m.home.stats.title}
            skeletonHeight={140}
            onRetry={() => void profile.refetch()}
          >
            {(value) => (value ? <StatsCard stats={value} /> : null)}
          </HomeBlock>
          {home.data ? (
            <HomeStanding rows={standingInSport(home.data.standing, sport)} />
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}
