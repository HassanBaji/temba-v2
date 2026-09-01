import { TRPCError } from "@trpc/server";

import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { kickRegisteredUser } from "~/server/games/kick-registered-user";
import { kickWaitlistEntry } from "~/server/games/kick-waitlist-entry";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function kick(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    userId?: string;
    waitlistId?: string;
  },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.organizerUserId);
  if (args.waitlistId) {
    await kickWaitlistEntry(database, game.id, args.waitlistId);
    return { ok: true as const };
  }
  if (!args.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Kick a registered User or a waitlist entry",
    });
  }
  const userId = args.userId;
  await database.transaction(async (tx) => {
    await kickRegisteredUser(tx, game, userId);
  });
  return { ok: true as const };
}
