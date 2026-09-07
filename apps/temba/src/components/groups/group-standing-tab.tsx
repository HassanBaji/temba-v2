import Link from "next/link";
import { Users } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { RowList } from "~/components/common/row-list";
import { LeaderboardRow } from "~/components/groups/leaderboard-row";
import { Button } from "~/components/ui/button";
import { groupHomeHasStandingResults } from "~/lib/group-home-chrome";

export function GroupStandingTab({
  isMember,
  leaderboard,
  groupId,
  canShowCreateGame,
}: {
  isMember: boolean;
  leaderboard: {
    userId: string;
    name: string | null;
    image?: string | null;
    totalSetsWon: number;
    totalPointsWon: number;
    totalGamesPlayed: number;
    position: number;
    isViewer: boolean;
  }[];
  groupId: string;
  canShowCreateGame: boolean;
}) {
  if (!isMember) {
    return (
      <EmptyState
        icon={Users}
        title="Join to see your standing"
        description="You are not a member of this Group, so you do not have a standing position here. Join to appear on the leaderboard."
      />
    );
  }

  const hasResults = groupHomeHasStandingResults(leaderboard);
  const createFirstGame = canShowCreateGame ? (
    <Button asChild variant="outline">
      <Link href={`/dashboard/games/new?groupId=${groupId}`}>
        Create the first game
      </Link>
    </Button>
  ) : null;

  if (!hasResults) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={Users}
          title="Standings appear once the first result is recorded."
          action={createFirstGame}
          className={leaderboard.length > 0 ? "py-6" : undefined}
        />
        {leaderboard.length > 0 ? (
          <RowList>
            {leaderboard.map((entry) => (
              <LeaderboardRow
                key={entry.userId}
                position={entry.position}
                name={entry.name ?? "Member"}
                image={entry.image}
                totalSetsWon={entry.totalSetsWon}
                totalPointsWon={entry.totalPointsWon}
                totalGamesPlayed={entry.totalGamesPlayed}
                isViewer={entry.isViewer}
                showRank={false}
              />
            ))}
          </RowList>
        ) : null}
      </div>
    );
  }

  return (
    <RowList>
      {leaderboard.map((entry) => (
        <LeaderboardRow
          key={entry.userId}
          position={entry.position}
          name={entry.name ?? "Member"}
          image={entry.image}
          totalSetsWon={entry.totalSetsWon}
          totalPointsWon={entry.totalPointsWon}
          totalGamesPlayed={entry.totalGamesPlayed}
          isViewer={entry.isViewer}
        />
      ))}
    </RowList>
  );
}
