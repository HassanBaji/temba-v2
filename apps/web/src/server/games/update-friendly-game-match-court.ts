import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { MatchStatusEnum, matches } from "@repo/db";

import { type GameRow } from "~/server/games/access";
import { assertCourtAssignable } from "~/server/games/assert-court-assignable";
import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function updateFriendlyGameMatchCourt(
  database: Tx,
  game: GameRow,
  matchId: string,
  courtId: string | null,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit a Match on a cancelled Game",
    });
  }
  if (game.format !== "friendly_game") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Court-only Match edit is for Friendly game",
    });
  }

  const match = await database.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (match?.gameId !== game.id) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Match not found",
    });
  }
  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit a cancelled Match",
    });
  }
  if (courtId) {
    await assertCourtAssignable(database, game, courtId);
  }
  await database
    .update(matches)
    .set({ courtId, updatedAt: new Date() })
    .where(eq(matches.id, match.id));
}
