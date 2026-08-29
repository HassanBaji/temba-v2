"use client";

import { useUser } from "@clerk/nextjs";
import { Users } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { StatStrip } from "~/components/common/stat-strip";
import { DashboardShell } from "~/components/dashboard-shell";
import { GameSummaryCard } from "~/components/games/game-summary-card";
import { Section } from "~/components/layout/section";
import { SportBadge } from "~/components/temba/sport-badge";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { usePendingInviteCount } from "~/hooks/use-pending-invite-count";
import { formatRelativeDay } from "~/lib/format-game-start";
import { api } from "~/trpc/react";

function formatClock(startTime: Date | string) {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function inviteWaitingCopy(count: number) {
  return count === 1
    ? "You have 1 invite waiting"
    : `You have ${count} invites waiting`;
}

function HomeSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-40 w-full rounded-lg" />
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

  const upcoming = home.data?.upcomingGames ?? [];
  const hero = upcoming[0];
  const rest = upcoming.slice(1);
  const restVisible = rest.slice(0, 5);
  const hasMoreUpcoming = rest.length > 5;
  const standing = home.data?.standing ?? [];
  const isFullyEmpty =
    Boolean(home.data) && upcoming.length === 0 && standing.length === 0;

  return (
    <DashboardShell
      title="Home"
      description="When you next play, anything waiting, and where you stand."
      action={
        <Button asChild>
          <Link href="/dashboard/games/new">Create Game</Link>
        </Button>
      }
      width="wide"
    >
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
          {firstName ? (
            <p className="text-meta text-muted-foreground">Hi, {firstName}</p>
          ) : null}

          <StatStrip
            items={[
              { label: "Games played", value: home.data.gamesPlayed },
              { label: "Games won", value: home.data.gamesWon },
              { label: "Sets won", value: home.data.setsWon },
            ]}
          />

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
                {hero ? (
                  <Card variant="elevated" className="p-0">
                    <Link
                      href={`/dashboard/groups/${hero.groupId}`}
                      className="focus-visible:ring-ring/50 flex min-h-11 flex-col gap-3 p-4 outline-none focus-visible:ring-[3px] md:grid md:grid-cols-[1fr_auto] md:items-end"
                    >
                      <div className="space-y-2">
                        <p className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
                          {formatRelativeDay(hero.startTime)}
                        </p>
                        <p className="text-display font-bold tracking-[-0.02em]">
                          {formatClock(hero.startTime)}
                        </p>
                        <p className="text-lead font-semibold">
                          {hero.name ?? "Untitled Game"}
                        </p>
                        <p className="text-meta text-muted-foreground">
                          {hero.groupName ?? "Group"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {hero.sport ? (
                            <SportBadge sport={hero.sport} />
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </Card>
                ) : null}

                {restVisible.length > 0 ? (
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
                    <RowList>
                      {restVisible.map((game) => (
                        <GameSummaryCard
                          key={game.id}
                          name={game.name}
                          startTime={game.startTime}
                          groupName={game.groupName}
                          sport={game.sport}
                          href={`/dashboard/groups/${game.groupId}`}
                        />
                      ))}
                    </RowList>
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
                      <span className="text-body text-brand font-semibold">
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
    </DashboardShell>
  );
}
