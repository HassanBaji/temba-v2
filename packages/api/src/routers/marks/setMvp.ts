import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { games, matches } from "@repo/db";

import { canPickMvp, type MvpRefusal } from "@repo/domain/marks";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, isGameOrganizer, requireGame } from "#src/games/access";
import { removeJob } from "#src/jobs/enqueue";
import { settleMvpJobKey } from "#src/jobs/specs";
import {
  loadMatchParticipants,
  marksMatch,
} from "#src/marks/match-participants";
import { mvpQuestion, settleMvp } from "#src/marks/settle-mvp";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The reason code is the message, so a client can show its refused-state copy. */
function refuse(reason: MvpRefusal): never {
  throw new TRPCError({ code: "FORBIDDEN", message: reason });
}

/**
 * An Organizer makes a participant the MVP while the window is open. In
 * organizer mode the pick may change until the close, where the Job settles
 * it; breaking a tied vote settles at once.
 */
export async function setMvp(
  database: DbClient,
  args: { gameId: string; userId: string; mvpUserId: string },
  now: Date = new Date(),
): Promise<{ ok: true }> {
  const game = await requireGame(database, args.gameId);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
  }
  const match = await marksMatch(database, game);
  if (!match) {
    refuse(game.mvpMode === "none" ? "wrong_mode" : "closed");
  }

  await database.transaction(async (tx) => {
    const [lockedMatch] = await tx
      .select()
      .from(matches)
      .where(eq(matches.id, match.id))
      .for("update");
    const [current] = await tx
      .select()
      .from(games)
      .where(eq(games.id, game.id))
      .for("update");
    if (!lockedMatch || !current) {
      refuse("closed");
    }
    const participants = await loadMatchParticipants(tx, lockedMatch, current);
    const question = await mvpQuestion(tx, {
      game: current,
      match: lockedMatch,
      participants,
      now,
    });
    const verdict = canPickMvp({
      ...question,
      settled: current.mvpSettledAt !== null,
      isOrganizer: await isGameOrganizer(tx, current, args.userId),
      pickerUserId: args.userId,
      userId: args.mvpUserId,
    });
    if (!verdict.ok) {
      refuse(verdict.reason);
    }

    const decidedBy =
      current.mvpMode === "organizer" ? "organizer" : "tie_break";
    await tx
      .update(games)
      .set({
        mvpUserId: args.mvpUserId,
        mvpDecidedBy: decidedBy,
        mvpDecidedAt: now,
      })
      .where(eq(games.id, current.id));

    if (decidedBy === "tie_break" && (await settleMvp(tx, current.id, now))) {
      await removeJob(tx, settleMvpJobKey(current.id));
    }
  });

  return { ok: true };
}

export const setMvpProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setMvp(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      mvpUserId: input.userId,
    });
  });
