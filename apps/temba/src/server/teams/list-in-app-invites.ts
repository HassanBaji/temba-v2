import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { teamMembers } from "@repo/db";

import { listLookup } from "~/server/invites/doors";
import { requireTeam } from "~/server/teams/helpers/require-team";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function listInAppInvites(
  database: DbClient,
  args: { teamId: string; userId: string },
) {
  const team = await requireTeam(database, args.teamId);

  if (team.createdBy !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the creator can list Team invites",
    });
  }

  const membership = await database.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, team.id),
      eq(teamMembers.userId, args.userId),
    ),
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the creator can list Team invites",
    });
  }

  return listLookup(database, { kind: "team", id: team.id });
}
