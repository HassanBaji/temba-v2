import { requireIncompleteTeamCreator } from "~/server/teams/helpers/require-incomplete-team-creator";
import { unusedInviteForTeam } from "~/server/teams/helpers/unused-invite-for-team";
import { searchLookupUsers as searchLookupUsersDoor } from "~/server/invites/search-lookup-users";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function searchLookupUsers(
  database: DbClient,
  args: { teamId: string; userId: string; query: string },
) {
  const { team, memberRows } = await requireIncompleteTeamCreator(
    database,
    args.teamId,
    args.userId,
  );
  const unusedLookup = await unusedInviteForTeam(database, team.id);

  return searchLookupUsersDoor(database, {
    query: args.query,
    excludeUserIds: [
      args.userId,
      ...memberRows.map((row) => row.userId),
      ...(unusedLookup ? [unusedLookup.userId] : []),
    ],
  });
}
