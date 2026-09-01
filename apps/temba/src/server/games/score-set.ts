import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { matchSets } from "@repo/db";

import { isGameOrganizer, requireGame } from "~/server/games/access";
import { assertMayWriteSets } from "~/server/games/assert-may-write-sets";
import { bothSlottedTeamsComplete } from "~/server/games/both-slotted-teams-complete";
import { requireMatchOnGame } from "~/server/games/require-match-on-game";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function scoreSet(
  database: DbClient,
  args: {
    gameId: string;
    matchId: string;
    setId: string;
    userId: string;
    slot1GamesWon: number;
    slot2GamesWon: number;
  },
) {
  const game = await requireGame(database, args.gameId);
  const match = await requireMatchOnGame(database, game.id, args.matchId);
  const organizer = await isGameOrganizer(database, game, args.userId);
  await assertMayWriteSets(database, game, match, args.userId, organizer);
  if (!(await bothSlottedTeamsComplete(database, match))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Both Match slots need complete Game teams before entering games won",
    });
  }
  const set = await database.query.matchSets.findFirst({
    where: eq(matchSets.id, args.setId),
  });
  if (set?.matchId !== match.id) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Set not found",
    });
  }
  const [updated] = await database
    .update(matchSets)
    .set({
      slot1GamesWon: args.slot1GamesWon,
      slot2GamesWon: args.slot2GamesWon,
      updatedAt: new Date(),
    })
    .where(eq(matchSets.id, set.id))
    .returning();
  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save Set",
    });
  }
  return { ok: true as const };
}

export const scoreMatchSet = scoreSet;
