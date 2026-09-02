"use client";

import { useUser } from "@clerk/nextjs";
import { Users } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { UpcomingGameHeroCard } from "~/components/games/upcoming-game-hero-card";
import { Section } from "~/components/layout/section";
import { SportBadge } from "~/components/temba/sport-badge";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { usePendingInviteCount } from "~/hooks/use-pending-invite-count";
import { api } from "~/trpc/react";

const HERO_GAME_LIMIT = 4;

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

  const upcoming = home.data?.upcomingGames ?? [];
  const heroGames = upcoming.slice(0, HERO_GAME_LIMIT);
  const hasMoreUpcoming = upcoming.length > HERO_GAME_LIMIT;
  const standing = home.data?.standing ?? [];
  const isFullyEmpty =
    Boolean(home.data) && upcoming.length === 0 && standing.length === 0;

  return (
    <DashboardShell title="Home" width="content" hidePageHeader={true}>
      <div className="space-y-6">
        {user ? (
          <div className="flex items-center gap-3">
            <UserAvatar name={displayName} image={image} size="lg" />
            <p className="text-h2 text-foreground min-w-0 truncate font-semibold tracking-[-0.02em]">
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
          <div className="space-y-6">
            {isFullyEmpty ? (
              <EmptyState
                icon={Users}
                title="You are not in any Groups yet"
                description="Groups are where you play and where your Standing lives."
                action={
                  <Button asChild>
                    <Link href="/dashboard/groups">Groups</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
                <div className="space-y-6">
                  {heroGames.length > 0 ? (
                    <Section
                      title="Upcoming"
                      action={
                        hasMoreUpcoming ? (
                          <Button asChild variant="ghost">
                            <Link href="/dashboard/games">See all</Link>
                          </Button>
                        ) : null
                      }
                    >
                      <ul
                        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 min-[430px]:-mx-5 min-[430px]:px-5 md:-mx-6 md:px-6 xl:-mx-8 xl:px-8"
                        aria-label="Upcoming games"
                      >
                        {heroGames.map((game) => (
                          <li
                            key={game.id}
                            className="w-[min(100%,22rem)] shrink-0 snap-start"
                          >
                            <UpcomingGameHeroCard
                              href={`/dashboard/games/${game.id}`}
                              startTime={game.startTime}
                              sport={game.sport}
                              format={game.format}
                              venueName={game.venue?.name ?? null}
                              registeredUserCount={game.registeredUserCount}
                              playersAllowed={game.playersAllowed}
                              sides={game.sides}
                            />
                          </li>
                        ))}
                      </ul>
                    </Section>
                  ) : null}
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

                  {standing.length > 0 ? (
                    <Section title="Your standing">
                      <RowList>
                        {standing.map((entry) => (
                          <ListRow
                            key={entry.groupId}
                            asChild
                            title={entry.groupName ?? "Untitled Group"}
                            meta={`${entry.position} of ${entry.memberCount}`}
                            trailing={
                              <div className="flex items-center gap-2">
                                {entry.sport ? (
                                  <SportBadge sport={entry.sport} />
                                ) : null}
                                <span className="text-lead font-semibold tabular-nums">
                                  #{entry.position} of {entry.memberCount}
                                </span>
                              </div>
                            }
                          >
                            <Link href={`/dashboard/groups/${entry.groupId}`} />
                          </ListRow>
                        ))}
                      </RowList>
                    </Section>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}
