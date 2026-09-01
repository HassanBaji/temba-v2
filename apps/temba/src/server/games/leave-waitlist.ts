import { requireGame } from "~/server/games/access";
import { leaveWaitlistEntry } from "~/server/games/waitlist";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function leaveWaitlist(
  database: DbClient,
  args: { gameId: string; userId: string },
) {
  await requireGame(database, args.gameId);
  await leaveWaitlistEntry(database, args.gameId, args.userId);
  return { ok: true as const };
}
