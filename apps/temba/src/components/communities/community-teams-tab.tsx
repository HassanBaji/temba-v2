import { Users } from "lucide-react";
import Link from "next/link";

import { AvatarStack } from "~/components/common/avatar-stack";
import { EmptyState } from "~/components/common/empty-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { SportBadge } from "~/components/temba/sport-badge";
import type { ClubTeam } from "~/server/communities";

export function CommunityTeamsTab({ teams }: { teams: ClubTeam[] }) {
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
            <AvatarStack
              people={team.members}
              openSeats={team.members.length < 2 ? 1 : 0}
            />
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
