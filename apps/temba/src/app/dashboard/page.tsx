"use client";

import { useUser } from "@clerk/nextjs";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { HomeComingUp } from "~/components/home/home-coming-up";
import { HomeHeader } from "~/components/home/home-header";
import { HomeNoGames, HomeNextGame } from "~/components/home/home-next-game";
import { HomeRatingCard } from "~/components/home/home-rating-card";
import { HomeRecentFormCard } from "~/components/home/home-recent-form-card";
import { HomeStatsCard } from "~/components/home/home-stats-card";
import { Section } from "~/components/layout/section";
import { GAME_FORMAT_LABELS } from "~/components/temba/typed-labels";
import { Skeleton } from "~/components/ui/skeleton";
import { flattenSidesToHomeSeats } from "~/lib/home-seats";
import { api } from "~/trpc/react";

function formatLabel(format: string) {
  if (format in GAME_FORMAT_LABELS) {
    return GAME_FORMAT_LABELS[format as keyof typeof GAME_FORMAT_LABELS];
  }
  return format.replaceAll("_", " ");
}

function HomeSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
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
  const [nextGame, ...comingUp] = heroGames;

  return (
    <DashboardShell width="content" hidePageHeader={true} hideMobileTopBar>
      <div className="mx-auto mt-6 w-full min-w-0 max-w-[420px] space-y-[26px] lg:mt-2">
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
          <>
            {nextGame ? (
              <HomeNextGame
                id={nextGame.id}
                phase={nextGame.phase}
                venueName={nextGame.venue?.name ?? "Game"}
                formatLabel={formatLabel(String(nextGame.format))}
                startsAt={new Date(nextGame.startTime)}
                seats={flattenSidesToHomeSeats(nextGame.sides)}
              />
            ) : (
              <HomeNoGames />
            )}
            <HomeComingUp
              games={comingUp.map((game) => ({
                id: game.id,
                venueName: game.venue?.name ?? "Game",
                startsAt: new Date(game.startTime),
                seatsTaken: game.registeredUserCount,
                seatsTotal: game.playersAllowed ?? game.sides.length * 2,
              }))}
            />
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
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
