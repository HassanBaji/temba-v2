import { Calendar } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { GroupGameCard } from "~/components/groups/group-game-card";
import { Section } from "~/components/layout/section";
import { Button } from "~/components/ui/button";
import { type RouterOutputs } from "~/trpc/react";

type GroupHome = RouterOutputs["groups"]["byId"];

export function GroupGamesTab({
  upcomingGames,
  gameHistory,
  groupId,
  isCommunityArchived,
  canShowCreateGame,
}: {
  upcomingGames: GroupHome["upcomingGames"];
  gameHistory: GroupHome["gameHistory"];
  groupId: string;
  isCommunityArchived: boolean;
  canShowCreateGame: boolean;
}) {
  const hasAny = upcomingGames.length > 0 || gameHistory.length > 0;
  const createFirstGame = canShowCreateGame ? (
    <Button asChild variant="outline">
      <Link href={`/dashboard/games/new?groupId=${groupId}`}>
        Create the first game
      </Link>
    </Button>
  ) : null;
  const archiveCopy =
    "Existing Games stay listed here, not on public pickup. Join, waitlist, and Game invites are closed while the Community is Soft-archived.";

  if (!hasAny) {
    return (
      <EmptyState
        icon={Calendar}
        title="No Games yet"
        description={
          isCommunityArchived
            ? archiveCopy
            : "When a Game is set with a live window or Match, it will show up here."
        }
        action={createFirstGame}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Section
        title="Upcoming"
        description={
          isCommunityArchived
            ? archiveCopy
            : "Upcoming Games for this Group, soonest first."
        }
      >
        {upcomingGames.length === 0 ? (
          <p className="text-body text-muted-foreground">
            No upcoming Games scheduled for this Group.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcomingGames.map((game) => (
              <GroupGameCard key={game.id} game={game} showJoinLabel />
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="History"
        description="Past or cancelled Games, newest first."
      >
        {gameHistory.length === 0 ? (
          <p className="text-body text-muted-foreground">
            No Game history yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {gameHistory.map((game) => (
              <GroupGameCard key={game.id} game={game} />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
