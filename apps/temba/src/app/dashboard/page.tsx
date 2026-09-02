"use client";

import { useUser } from "@clerk/nextjs";
import { Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { StatStrip } from "~/components/common/stat-strip";
import { useCreateAccess } from "~/components/create-access-gate";
import { DashboardShell } from "~/components/dashboard-shell";
import { GameSummaryCard } from "~/components/games/game-summary-card";
import { Section } from "~/components/layout/section";
import { SportBadge } from "~/components/temba/sport-badge";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { usePendingInviteCount } from "~/hooks/use-pending-invite-count";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { formatRelativeDay } from "~/lib/format-game-start";
import { formatPricePerPlayerCardMeta } from "~/lib/price-per-player";
import {
  gameSummaryPrimaryAction,
  showsFriendlyRoster,
} from "~/lib/game-summary-cta";
import { api, type RouterOutputs } from "~/trpc/react";

type HomeUpcomingGame = RouterOutputs["users"]["home"]["upcomingGames"][number];

function formatClock(startTime: Date | string) {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function occupancyLabel(
  registeredUserCount: number,
  playersAllowed: number | null,
) {
  if (playersAllowed != null) {
    return `${registeredUserCount}/${playersAllowed} players`;
  }
  return null;
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
  const { hasCreateAccess } = useCreateAccess();
  const home = api.users.home.useQuery();
  const invites = usePendingInviteCount();
  const firstName = user?.firstName;
  const utils = api.useUtils();

  async function refreshLists() {
    await Promise.all([
      utils.users.home.invalidate(),
      utils.games.listMyGames.invalidate(),
      utils.games.listPublicPickup.invalidate(),
      utils.games.byId.invalidate(),
    ]);
  }

  const registerSeat = api.games.registerSeat.useMutation({
    onSuccess: async (result) => {
      toast.success(result.waitlisted ? "Joined waitlist" : "Seated");
      await refreshLists();
    },
    onError: async (error) => {
      toastGlobalFormError(error);
      await refreshLists();
    },
  });

  const register = api.games.register.useMutation({
    onSuccess: async (result) => {
      toast.success(result.waitlisted ? "Joined waitlist" : "Registered");
      await refreshLists();
    },
    onError: async (error) => {
      toastGlobalFormError(error);
      await refreshLists();
    },
  });

  const pendingGameId =
    (registerSeat.isPending ? registerSeat.variables?.gameId : null) ??
    (register.isPending ? register.variables?.gameId : null) ??
    null;

  function onJoinSeat(
    gameId: string,
    sideIndex: number,
    position: "left" | "right",
  ) {
    registerSeat.mutate({ gameId, sideIndex, position });
  }

  function onJoinWaitlist(game: HomeUpcomingGame) {
    if (game.format === "americano") {
      register.mutate({ gameId: game.id });
      return;
    }
    registerSeat.mutate({ gameId: game.id });
  }

  function onRegister(gameId: string) {
    register.mutate({ gameId });
  }

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
        hasCreateAccess ? (
          <Button asChild variant="brand">
            <Link href="/dashboard/games/new">Create Game</Link>
          </Button>
        ) : undefined
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
            <p className="text-h2 text-foreground font-bold tracking-[-0.02em]">
              Hi, {firstName}
            </p>
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
                  <Card variant="outlined" className="p-0">
                    <Link
                      href={`/dashboard/games/${hero.id}`}
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
                          {[
                            hero.groupName ?? "Pickup",
                            formatPricePerPlayerCardMeta(
                              hero.pricePerPlayerCents,
                            ),
                          ]
                            .filter((part): part is string => Boolean(part))
                            .join(" · ")}
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
                    <ul className="flex flex-col gap-3">
                      {restVisible.map((game) => (
                        <GameSummaryCard
                          key={game.id}
                          name={game.name}
                          startTime={game.startTime}
                          windowStart={game.windowStart}
                          windowEnd={game.windowEnd}
                          venueName={game.venue?.name}
                          location={game.venue?.city ?? game.venue?.name}
                          occupancy={occupancyLabel(
                            game.registeredUserCount,
                            game.playersAllowed,
                          )}
                          pricePerPlayerCents={game.pricePerPlayerCents}
                          sides={
                            showsFriendlyRoster(
                              game.format,
                              game.registrationMode,
                            )
                              ? game.sides
                              : undefined
                          }
                          primaryAction={gameSummaryPrimaryAction(game)}
                          actionPending={pendingGameId === game.id}
                          href={`/dashboard/games/${game.id}`}
                          onJoinSeat={(sideIndex, position) => {
                            onJoinSeat(game.id, sideIndex, position);
                          }}
                          onJoinWaitlist={() => {
                            onJoinWaitlist(game);
                          }}
                          onRegister={() => {
                            onRegister(game.id);
                          }}
                        />
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
    </DashboardShell>
  );
}
