import { Users } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { RowList } from "~/components/common/row-list";
import { LeaderboardRow } from "~/components/groups/leaderboard-row";

export function GroupStandingTab({
  isMember,
  leaderboard,
}: {
  isMember: boolean;
  leaderboard: {
    userId: string;
    name: string | null;
    totalSetsWon: number;
    totalPointsWon: number;
    totalGamesPlayed: number;
    position: number;
    isViewer: boolean;
  }[];
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

  if (leaderboard.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No members yet"
        description="When people join this Group, their standing will show here with sets, points, and Games at zero until they play."
      />
    );
  }

  return (
    <RowList>
      {leaderboard.map((entry) => (
        <LeaderboardRow
          key={entry.userId}
          position={entry.position}
          name={entry.name ?? "Member"}
          totalSetsWon={entry.totalSetsWon}
          totalPointsWon={entry.totalPointsWon}
          totalGamesPlayed={entry.totalGamesPlayed}
          isViewer={entry.isViewer}
        />
      ))}
    </RowList>
  );
}
