import { Users } from "lucide-react";
import Link from "next/link";

import { AvatarStack } from "~/components/common/avatar-stack";
import { EmptyState } from "~/components/common/empty-state";
import {
  COMMUNITY_NO_TEAMS_EMPTY,
  communityTeamRow,
} from "@repo/domain/community";
import { type RouterOutputs } from "~/trpc/react";

type ClubTeam = RouterOutputs["communities"]["byId"]["teams"][number];

function ClubTeamRow({ team }: { team: ClubTeam }) {
  const row = communityTeamRow(team);
  return (
    <li>
      <Link
        href={`/dashboard/teams/${row.id}`}
        className="focus-visible:ring-ring/50 hover:bg-muted/50 flex w-full min-w-0 items-center gap-3.5 px-5 py-[18px] outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
      >
        <AvatarStack
          people={row.people}
          openSeats={row.openSeats}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-body break-words">{row.displayName}</p>
          {row.sport ? (
            <p className="text-meta text-muted-foreground mt-0.5">
              {row.sport}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

export function CommunityTeamsTab({ teams }: { teams: ClubTeam[] }) {
  if (teams.length === 0) {
    return <EmptyState icon={Users} {...COMMUNITY_NO_TEAMS_EMPTY} />;
  }

  return (
    <ul className="divide-rule border-rule divide-y overflow-hidden rounded-[14px] border">
      {teams.map((team) => (
        <ClubTeamRow key={team.id} team={team} />
      ))}
    </ul>
  );
}
