import { TRPCError } from "@trpc/server";
import { and, eq, inArray, or } from "drizzle-orm";

import { gameWaitlist, teamMembers } from "@repo/db";

import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function leaveWaitlistEntry(
  database: Tx | typeof db,
  gameId: string,
  userId: string,
) {
  const memberships = await database.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
    columns: { teamId: true },
  });
  const teamIds = memberships.map((row) => row.teamId);
  const deleted = await database
    .delete(gameWaitlist)
    .where(
      and(
        eq(gameWaitlist.gameId, gameId),
        teamIds.length > 0
          ? or(
              eq(gameWaitlist.userId, userId),
              inArray(gameWaitlist.teamId, teamIds),
            )
          : eq(gameWaitlist.userId, userId),
      ),
    )
    .returning({ id: gameWaitlist.id });
  if (deleted.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You are not on the waitlist",
    });
  }
}
