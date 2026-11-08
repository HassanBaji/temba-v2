import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { searchLookupUsers as searchLookupUsersDoor } from "#src/invites/search-lookup-users";
import { requireIncompleteTeamCreator } from "#src/teams/helpers/require-incomplete-team-creator";
import { unusedLookupInvitesForTeam } from "#src/teams/helpers/unused-invites-for-team";

type DbClient = typeof db;

/** Without a Team it serves the New team screen, where only the viewer is on the Roster. */
export async function searchLookupUsers(
  database: DbClient,
  args: { teamId?: string; userId: string; query: string },
) {
  if (!args.teamId) {
    return searchLookupUsersDoor(database, {
      query: args.query,
      excludeUserIds: [args.userId],
    });
  }
  const { team, memberRows } = await requireIncompleteTeamCreator(
    database,
    args.teamId,
    args.userId,
  );
  const unusedLookups = await unusedLookupInvitesForTeam(database, team.id);

  return searchLookupUsersDoor(database, {
    query: args.query,
    excludeUserIds: [
      args.userId,
      ...memberRows.map((row) => row.userId),
      ...unusedLookups.map((invite) => invite.userId),
    ],
  });
}

export const searchLookupUsersProcedure = protectedProcedure
  .input(
    z.object({
      teamId: z.string().uuid().optional(),
      query: z.string().trim().max(255),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return searchLookupUsers(ctx.db, {
      teamId: input.teamId,
      userId: appUser.id,
      query: input.query,
    });
  });
