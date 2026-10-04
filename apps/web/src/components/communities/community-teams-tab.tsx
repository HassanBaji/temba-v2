import { Users } from "lucide-react";
import Link from "next/link";

import { AvatarStack } from "~/components/common/avatar-stack";
import { EmptyState } from "~/components/common/empty-state";
import { groupHomeSportLabel } from "@repo/domain/group-home-chrome";
import { type RouterOutputs } from "~/trpc/react";

type ClubTeam = RouterOutputs["communities"]["byId"]["teams"][number];

function ClubTeamRow({ team }: { team: ClubTeam }) {
  const sport = groupHomeSportLabel(team.sport);
  return (
    <li>
      <Link
        href={`/dashboard/teams/${team.id}`}
        className="focus-visible:ring-ring/50 hover:bg-muted/50 flex w-full min-w-0 items-center gap-3.5 px-5 py-[18px] outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
      >
        <AvatarStack
          people={team.members}
          openSeats={team.members.length < 2 ? 1 : 0}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-body break-words">{team.displayName}</p>
          {sport ? (
            <p className="text-meta text-muted-foreground mt-0.5">{sport}</p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

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
    <ul className="divide-rule border-rule divide-y overflow-hidden rounded-[14px] border">
      {teams.map((team) => (
        <ClubTeamRow key={team.id} team={team} />
      ))}
    </ul>
  );
}
