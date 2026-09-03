"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";

import { ErrorState } from "~/components/common/error-state";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { UpcomingGamesCarousel } from "~/components/games/upcoming-games-carousel";
import { HomeRatingCard } from "~/components/home/home-rating-card";
import { HomeStatsCard } from "~/components/home/home-stats-card";
import { Section } from "~/components/layout/section";
import { Card } from "~/components/ui/card";
import TembaTextLogo from "~/components/ui/icons/temba-text-logo";
import { Skeleton } from "~/components/ui/skeleton";
import { usePendingInviteCount } from "~/hooks/use-pending-invite-count";
import { api } from "~/trpc/react";

function inviteWaitingCopy(count: number) {
  return count === 1
    ? "You have 1 invite waiting"
    : `You have ${count} invites waiting`;
}

function HomeSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <Skeleton className="h-16 w-full" />
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
  const invites = usePendingInviteCount();

  const firstName = user?.firstName;
  const displayName =
    user?.fullName ?? user?.firstName ?? user?.username ?? "You";
  const image = user?.imageUrl;

  const heroGames = home.data?.carouselGames ?? [];

  return (
    <DashboardShell
      width="content"
      hidePageHeader={true}
      icon={<TembaTextLogo className="mt-2 h-6 w-auto" />}
    >
      <div className="min-w-0 space-y-2 lg:space-y-6">
        {user ? (
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar name={displayName} image={image} size="lg" />
            <p className="lg:text-h2 min-w-0 truncate text-xl font-semibold tracking-[-0.02em] lg:font-semibold">
              Hi, {firstName ?? displayName} 👋
            </p>
          </div>
        ) : null}

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
          <div className="min-w-0 lg:space-y-6">
            <div className="grid min-w-0 gap-2 lg:gap-8">
              <div className="min-w-0 space-y-6">
                {heroGames.length > 0 ? (
                  <Section title="Your games" className="mt-4 min-w-0">
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
                        };
                      })}
                    />
                  </Section>
                ) : null}

                <Section title="Your level" className="min-w-0">
                  <HomeRatingCard className="mt-4" />
                </Section>

                <Section title="Your overall stats" className="min-w-0">
                  <HomeStatsCard
                    gamesPlayed={home.data.gamesPlayed}
                    gamesWon={home.data.gamesWon}
                  />
                </Section>
              </div>

              <div className="space-y-6">
                {invites.showCount ? (
                  <Card variant="outlined" className="p-0">
                    <Link
                      href="/dashboard/invites"
                      className="focus-visible:ring-ring/50 flex min-h-11 items-center justify-between gap-3 p-4 outline-none focus-visible:ring-[3px]"
                    >
                      <p className="text-lead font-semibold">
                        {inviteWaitingCopy(invites.count)}
                      </p>
                      <span className="text-body text-foreground font-semibold">
                        Review
                      </span>
                    </Link>
                  </Card>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}
