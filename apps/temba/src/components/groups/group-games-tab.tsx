import { Calendar } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { RowList } from "~/components/common/row-list";
import { GameSummaryCard } from "~/components/games/game-summary-card";
import { Section } from "~/components/layout/section";

type GroupGame = {
  id: string;
  name: string | null;
  startTime: Date | string;
  sport: string | null;
  format: string;
  cancelledAt: Date | string | null;
};

export function GroupGamesTab({
  upcomingGames,
  gameHistory,
  groupName,
  isCommunityArchived,
}: {
  upcomingGames: GroupGame[];
  gameHistory: GroupGame[];
  groupName: string;
  isCommunityArchived: boolean;
}) {
  const hasAny = upcomingGames.length > 0 || gameHistory.length > 0;

  if (!hasAny) {
    return (
      <EmptyState
        icon={Calendar}
        title="No Games yet"
        description={
          isCommunityArchived
            ? "Existing Games stay listed here, not on public pickup. Join, waitlist, and Game invites are closed while the Community is Soft-archived."
            : "When a Game is set with a live window or Match, it will show up here."
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Section
        title="Upcoming"
        description={
          isCommunityArchived
            ? "Existing Games stay listed here, not on public pickup. Join, waitlist, and Game invites are closed while the Community is Soft-archived."
            : "Upcoming Games for this Group, soonest first."
        }
      >
        {upcomingGames.length === 0 ? (
          <p className="text-body text-muted-foreground">
            No upcoming Games scheduled for this Group.
          </p>
        ) : (
          <RowList>
            {upcomingGames.map((game) => (
              <GameSummaryCard
                key={game.id}
                name={game.name}
                startTime={game.startTime}
                groupName={groupName}
                sport={game.sport}
                cancelled={Boolean(game.cancelledAt)}
                href={`/dashboard/games/${game.id}`}
              />
            ))}
          </RowList>
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
          <RowList>
            {gameHistory.map((game) => (
              <GameSummaryCard
                key={game.id}
                name={game.name}
                startTime={game.startTime}
                groupName={groupName}
                sport={game.sport}
                cancelled={Boolean(game.cancelledAt)}
                href={`/dashboard/games/${game.id}`}
              />
            ))}
          </RowList>
        )}
      </Section>
    </div>
  );
}
