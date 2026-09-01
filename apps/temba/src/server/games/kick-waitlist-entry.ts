import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { gameWaitlist } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function kickWaitlistEntry(
  database: DbClient,
  gameId: string,
  waitlistId: string,
) {
  const deleted = await database
    .delete(gameWaitlist)
    .where(
      and(eq(gameWaitlist.id, waitlistId), eq(gameWaitlist.gameId, gameId)),
    )
    .returning({ id: gameWaitlist.id });
  if (deleted.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Waitlist entry not found",
    });
  }
}
