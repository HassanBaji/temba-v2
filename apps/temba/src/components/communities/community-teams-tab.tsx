import { Users } from "lucide-react";
import Link from "next/link";

import { AvatarStack } from "~/components/common/avatar-stack";
import { EmptyState } from "~/components/common/empty-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { SportBadge } from "~/components/temba/sport-badge";

type LinkedTeam = {
  id: string;
  displayName: string;
  sport: string;
};

function peopleFromDisplayName(displayName: string) {
  const parts = displayName
    .split(" & ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(0, 2).map((name) => ({ name }));
  }
  return [{ name: displayName }];
}

export function CommunityTeamsTab({ teams }: { teams: LinkedTeam[] }) {
  if (teams.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No linked Teams"
        description="This Community has no linked Teams yet."
      />
    );
  }

  return (
    <RowList>
      {teams.map((team) => (
        <ListRow
          key={team.id}
          asChild
          leading={
            <AvatarStack people={peopleFromDisplayName(team.displayName)} />
          }
          title={team.displayName}
          trailing={team.sport ? <SportBadge sport={team.sport} /> : undefined}
        >
          <Link href={`/dashboard/teams/${team.id}`} />
        </ListRow>
      ))}
    </RowList>
  );
}
