import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { MatchStatusEnum, matches } from "@repo/db";

import { type GameRow } from "~/server/games/access";
import { applyMatchSides } from "~/server/games/helpers/apply-match-sides";
import { matchTimes } from "~/server/games/helpers/match-times";
import { type TournamentMatchInput } from "~/server/games/utils";
import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function updateTournamentMatch(
  database: Tx,
  game: GameRow,
  matchId: string,
  input: TournamentMatchInput,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit a Match on a cancelled Game",
    });
  }
  if (game.format !== "friendly_tournament") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Edit Matches on a Friendly tournament",
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
  await applyMatchSides(database, game.id, input);
  const values = matchTimes(input);
  await database
    .update(matches)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(matches.id, match.id));
}
