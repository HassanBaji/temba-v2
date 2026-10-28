"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { HomeBlock } from "~/components/home/home-block";
import { HomeHeader } from "~/components/home/home-header";
import {
  levelFromApi,
  slotOf,
  standingInSport,
} from "~/components/home/home-model";
import { HomeStanding } from "~/components/home/home-standing";
import { LevelCard } from "~/components/home/level-card";
import { RecentFormCard } from "~/components/home/recent-form-card";
import {
  UpNextEmpty,
  UpNextHeading,
  UpNextHero,
  UpNextList,
} from "~/components/home/up-next";
import { upNextItems, upNextWeekLabel } from "~/components/home/up-next-model";
import { SportSegments } from "~/components/temba/sport-segments";
import {
  deriveRecentForm,
  RECENT_FORM_MATCH_COUNT,
} from "@repo/domain/home-recent-form";
import { homeNoGamesCreateAction } from "@repo/domain/home-no-games";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";
import { useNow } from "~/hooks/use-now";
import { api } from "~/trpc/react";

export default function HomePage() {
  const { user } = useUser();
  const now = useNow();
  const [sport, setSport] = useState<Sport>(DEFAULT_SPORT);

  const home = api.users.home.useQuery();
  const rating = api.ratings.me.useQuery({ sport });
  const history = api.games.listMyMatchHistory.useQuery({
    limit: RECENT_FORM_MATCH_COUNT,
    sport,
  });
  const createGroups = api.games.listCreateGroups.useQuery();

  const name = user?.fullName ?? user?.firstName ?? user?.username ?? "You";
  const upNext = slotOf(home, (data) => upNextItems(data.carouselGames));
  const level = slotOf(rating, levelFromApi);
  const recentForm = slotOf(history, deriveRecentForm);
  const createAction = homeNoGamesCreateAction({
    createGroupCount: createGroups.data?.length,
  });

  return (
    <DashboardShell width="content" hidePageHeader={true} hideMobileTopBar>
      <div className="mt-6 flex w-full min-w-0 flex-col gap-[26px] lg:mt-2">
        <h1 className="sr-only">Home</h1>
        <HomeHeader name={name} image={user?.imageUrl} />

        <section className="flex flex-col gap-3">
          <UpNextHeading
            label={
              upNext.status === "ready"
                ? upNextWeekLabel(upNext.value, now)
                : ""
            }
          />
          <HomeBlock
            slot={upNext}
            title="Up next"
            skeletonHeight={224}
            onRetry={() => void home.refetch()}
          >
            {([next, ...rest]) =>
              next ? (
                <div className="flex flex-col gap-2">
                  <UpNextHero item={next} />
                  <UpNextList items={rest} />
                </div>
              ) : (
                <UpNextEmpty createAction={createAction} />
              )
            }
          </HomeBlock>
        </section>

        <section aria-label="Your sport" className="flex flex-col gap-3">
          <SportSegments value={sport} onSelect={setSport} />
          <HomeBlock
            slot={level}
            title="Level"
            skeletonHeight={200}
            onRetry={() => void rating.refetch()}
          >
            {(value) => <LevelCard level={value} sport={sport} />}
          </HomeBlock>
          <HomeBlock
            slot={recentForm}
            title="Recent form"
            skeletonHeight={160}
            onRetry={() => void history.refetch()}
          >
            {(form) =>
              form.playedCount > 0 ? <RecentFormCard form={form} /> : null
            }
          </HomeBlock>
          {home.data ? (
            <HomeStanding rows={standingInSport(home.data.standing, sport)} />
          ) : null}
        </section>
      </div>
    </DashboardShell>
  );
}
