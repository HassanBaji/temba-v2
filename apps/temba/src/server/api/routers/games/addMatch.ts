import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { matches } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import {
  assertGameOrganizer,
  requireGame,
  type GameRow,
} from "~/server/games/access";
import { applyMatchSides } from "~/server/games/helpers/apply-match-sides";
import { matchTimes } from "~/server/games/helpers/match-times";
import { type TournamentMatchInput } from "~/server/games/utils";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function addTournamentMatch(
  database: Tx,
  game: GameRow,
  input: TournamentMatchInput,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot add a Match on a cancelled Game",
    });
  }
  if (game.format !== "friendly_tournament") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Add Matches on a Friendly tournament",
    });
  }
  await applyMatchSides(database, game.id, input);
  const values = matchTimes(input);
  const [match] = await database
    .insert(matches)
    .values({
      gameId: game.id,
      ...values,
    })
    .returning({ id: matches.id });
  if (!match) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create Match",
    });
  }
  return match;
}

export async function addMatch(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    startTime: Date | null;
    endTime: Date | null;
    durationInMinutes: number | null;
    courtId: string | null;
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
  },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  return database.transaction(async (tx) => {
    return addTournamentMatch(tx, game, {
      startTime: args.startTime,
      endTime: args.endTime,
      durationInMinutes: args.durationInMinutes,
      courtId: args.courtId,
      slot1GameTeamId: args.slot1GameTeamId,
      slot2GameTeamId: args.slot2GameTeamId,
    });
  });
}

export const addMatchProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      startTime: z.coerce.date().nullable().optional(),
      endTime: z.coerce.date().nullable().optional(),
      durationInMinutes: z.number().int().nonnegative().nullable().optional(),
      courtId: z.string().uuid().nullable().optional(),
      slot1GameTeamId: z.string().uuid().nullable().optional(),
      slot2GameTeamId: z.string().uuid().nullable().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return addMatch(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      durationInMinutes: input.durationInMinutes ?? null,
      courtId: input.courtId ?? null,
      slot1GameTeamId: input.slot1GameTeamId ?? null,
      slot2GameTeamId: input.slot2GameTeamId ?? null,
    });
  });
