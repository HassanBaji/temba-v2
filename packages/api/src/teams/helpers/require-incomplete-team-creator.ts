import { TRPCError } from "@trpc/server";

import { teamIsFull, teamRosterRule } from "@repo/domain/team-roster";

import { listTeamMembers } from "#src/teams/helpers/list-team-members";
import { refuseIfLinkedCommunityArchived } from "#src/teams/helpers/refuse-if-linked-community-archived";
import { requireTeam } from "#src/teams/helpers/require-team";
import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireIncompleteTeamCreator(
  database: DbClient,
  teamId: string,
  userId: string,
) {
  const team = await requireTeam(database, teamId);
  await refuseIfLinkedCommunityArchived(
    database,
    team,
    "Cannot invite into a Team linked to an archived Community",
  );

  if (team.createdBy !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: teamRosterRule(team.sport).pairIsUnique
        ? "Only the creator can invite a partner while the Team is incomplete"
        : "Only the creator can invite into this Team",
    });
  }

  const memberRows = await listTeamMembers(database, team.id);
  if (teamIsFull(memberRows.length, team.sport)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Team is full",
    });
  }

  return { team, memberRows };
}
