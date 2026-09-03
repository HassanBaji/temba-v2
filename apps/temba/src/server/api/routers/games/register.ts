import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertUserPassesJoinGate, requireGame } from "~/server/games/access";
import { admit } from "~/server/games/admit";
import { throwIfAdmitRefused } from "~/server/games/helpers/throw-if-admit-refused";
import { userAlreadyOnGame } from "~/server/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "~/server/games/helpers/user-already-waitlisted";
import { enqueueWaitlistUser } from "~/server/games/enqueue-waitlist-user";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function register(
  database: DbClient,
  args: { gameId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  const now = new Date();

  if (game.format !== "americano") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Register as yourself on an Americano",
    });
  }
  if (game.registrationMode !== "individual") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Game is team-only",
    });
  }

  await assertUserPassesJoinGate(database, game, args.userId);

  if (await userAlreadyOnGame(database, game.id, args.userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already registered on this Game",
    });
  }
  if (await userAlreadyWaitlisted(database, game.id, args.userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already on the waitlist",
    });
  }

  const admitted = await admit(database, {
    game,
    door: "register",
    party: { kind: "user", userId: args.userId },
    now,
  });
  if (!admitted.ok) {
    if (admitted.reason === "full") {
      await enqueueWaitlistUser(database, game.id, args.userId);
      return { ok: true as const, waitlisted: true as const };
    }
    throwIfAdmitRefused(admitted);
  }
  return { ok: true as const, waitlisted: false as const };
}

export const registerProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return register(ctx.db, { gameId: input.gameId, userId: appUser.id });
  });
