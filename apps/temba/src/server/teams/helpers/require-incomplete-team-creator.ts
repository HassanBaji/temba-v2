import { TRPCError } from "@trpc/server";

import { listTeamMembers } from "~/server/teams/helpers/list-team-members";
import { refuseIfLinkedCommunityArchived } from "~/server/teams/helpers/refuse-if-linked-community-archived";
import { requireTeam } from "~/server/teams/helpers/require-team";
import { type db } from "~/server/db";

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
      message:
        "Only the creator can invite a partner while the Team is incomplete",
    });
  }

  const memberRows = await listTeamMembers(database, team.id);
  if (memberRows.length >= 2) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Team is full",
    });
  }

  return { team, memberRows };
}
