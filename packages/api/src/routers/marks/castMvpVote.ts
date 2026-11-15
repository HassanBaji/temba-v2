import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameMvpVotes, games, matches } from "@repo/db";

import { canCastMvpVote, type MvpRefusal } from "@repo/domain/marks";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, requireGame } from "#src/games/access";
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
 * An eligible voter casts or changes their MVP vote while the vote is open.
 * The last vote settles the MVP at once and removes the Job; a vote that ties
 * asks the Organizers instead. The Match and Game row locks serialise two
 * last votes, so the early settle cannot be missed.
 */
export async function castMvpVote(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    candidateUserId: string;
    locale?: Locale;
  },
  now: Date = new Date(),
): Promise<{ ok: true }> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.notFound,
    });
  }
  const match = await marksMatch(database, game);
  if (!match) {
    refuse(game.mvpMode === "vote" ? "closed" : "wrong_mode");
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
    const verdict = canCastMvpVote({
      ...question,
      settled: current.mvpSettledAt !== null,
      voterUserId: args.userId,
      candidateUserId: args.candidateUserId,
    });
    if (!verdict.ok) {
      refuse(verdict.reason);
    }

    await tx
      .insert(gameMvpVotes)
      .values({
        gameId: current.id,
        voterUserId: args.userId,
        candidateUserId: args.candidateUserId,
      })
      .onConflictDoUpdate({
        target: [gameMvpVotes.gameId, gameMvpVotes.voterUserId],
        set: { candidateUserId: args.candidateUserId, updatedAt: now },
      });

    if (await settleMvp(tx, current.id, now)) {
      await removeJob(tx, settleMvpJobKey(current.id));
    }
  });

  return { ok: true };
}

export const castMvpVoteProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      candidateUserId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return castMvpVote(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      candidateUserId: input.candidateUserId,
      locale: ctx.locale,
    });
  });
