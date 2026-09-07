"use client";

import { useUser } from "@clerk/nextjs";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { UpcomingGamesCarousel } from "~/components/games/upcoming-games-carousel";
import { HomeHeader } from "~/components/home/home-header";
import { HomeRatingCard } from "~/components/home/home-rating-card";
import { HomeRecentFormCard } from "~/components/home/home-recent-form-card";
import { HomeStatsCard } from "~/components/home/home-stats-card";
import { Section } from "~/components/layout/section";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

function HomeSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <Skeleton className="h-56 w-full rounded-[1.75rem]" />
      <Skeleton className="h-36 w-full rounded-[1.75rem]" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="space-y-0">
        <Skeleton className="h-16 w-full rounded-none" />
        <Skeleton className="h-16 w-full rounded-none" />
      </div>
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

export default function HomePage() {
  const { user } = useUser();
  const home = api.users.home.useQuery();

  const displayName =
    user?.fullName ?? user?.firstName ?? user?.username ?? "You";
  const image = user?.imageUrl;

  const heroGames = home.data?.carouselGames ?? [];
  const bookedGameCount = heroGames.length;
  const pendingInviteCount = home.data?.pendingInviteCount ?? 0;

  return (
    <DashboardShell width="content" hidePageHeader={true} hideMobileTopBar>
      <div className="mt-6 min-w-0 space-y-6 lg:mt-2">
        <HomeHeader
          name={displayName}
          image={image}
          pendingInviteCount={pendingInviteCount}
          bookedGameCount={bookedGameCount}
          ready={home.data != null}
        />

        {home.isLoading ? <HomeSkeleton /> : null}

        {home.error ? (
          <ErrorState
            title="Home could not be loaded"
            message={home.error.message}
            onRetry={() => {
              void home.refetch();
            }}
          />
        ) : null}

        {home.data ? (
          <div className="min-w-0 space-y-6 lg:space-y-6">
            {heroGames.length > 0 ? (
              <Section title="Next games" className="min-w-0">
                <UpcomingGamesCarousel
                  games={heroGames.map((game) => {
                    const addResults =
                      game.phase === "needs_results" && game.canAddResults;
                    return {
                      id: game.id,
                      startTime: game.startTime,
                      sport: game.sport,
                      format: game.format,
                      venueName: game.venue?.name ?? null,
                      registeredUserCount: game.registeredUserCount,
                      playersAllowed: game.playersAllowed,
                      sides: game.sides,
                      levelMinTenths: game.levelMinTenths,
                      levelMaxTenths: game.levelMaxTenths,
                      href: addResults
                        ? `/dashboard/games/${game.id}?tab=results`
                        : `/dashboard/games/${game.id}`,
                      actionLabel: addResults
                        ? "Add results"
                        : "View game details",
                      endTime: game.windowEnd ?? game.startTime,
                    };
                  })}
                />
              </Section>
            ) : null}

            <Section title="Your level" className="min-w-0">
              <HomeRatingCard className="mt-2" />
            </Section>

            <Section title="Your recent form" className="min-w-0">
              <HomeRecentFormCard />
            </Section>

            <Section title="Your overall stats" className="min-w-0">
              <HomeStatsCard
                gamesPlayed={home.data.gamesPlayed}
                gamesWon={home.data.gamesWon}
              />
            </Section>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}
