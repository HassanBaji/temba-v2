import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { games } from "@repo/db";

import { assertCourtAssignable } from "~/server/games/assert-court-assignable";
import { assertGameTeamOnGame } from "~/server/games/assert-game-team-on-game";
import { type TournamentMatchInput } from "~/server/games/utils";
import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function applyMatchSides(
  database: Tx,
  gameId: string,
  input: TournamentMatchInput,
) {
  if (
    input.slot1GameTeamId &&
    input.slot2GameTeamId &&
    input.slot1GameTeamId === input.slot2GameTeamId
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A Match cannot use the same Game team in both slots",
    });
  }
  if (input.courtId) {
    const game = await database.query.games.findFirst({
      where: eq(games.id, gameId),
    });
    if (!game) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Game not found",
      });
    }
    await assertCourtAssignable(database, game, input.courtId);
  }
  if (input.slot1GameTeamId) {
    await assertGameTeamOnGame(database, gameId, input.slot1GameTeamId);
  }
  if (input.slot2GameTeamId) {
    await assertGameTeamOnGame(database, gameId, input.slot2GameTeamId);
  }
}
