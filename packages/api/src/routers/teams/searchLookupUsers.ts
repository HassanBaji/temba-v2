import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { searchLookupUsers as searchLookupUsersDoor } from "#src/invites/search-lookup-users";
import { requireIncompleteTeamCreator } from "#src/teams/helpers/require-incomplete-team-creator";
import { unusedInviteForTeam } from "#src/teams/helpers/unused-invite-for-team";

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

export const searchLookupUsersProcedure = protectedProcedure
  .input(
    z.object({
      teamId: z.string().uuid(),
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
