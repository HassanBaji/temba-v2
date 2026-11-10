import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, marks, matches } from "@repo/db";

import { marksWindow, type MarkRefusal } from "@repo/domain/marks";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, requireGame } from "#src/games/access";
import { withdrawUnseenMarkReceived } from "#src/marks/mark-received-notification";
import { marksMatch } from "#src/marks/match-participants";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const WINDOW_CLOSED: MarkRefusal = "window_closed";

/**
 * A giver takes back the Mark they gave a receiver while the Marks window is
 * open, so a mistap is not permanent. The receiver's Notification goes too
 * while it is unread and not emailed; once seen it stays.
 */
export async function retract(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    receiverUserId: string;
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
    throw new TRPCError({ code: "FORBIDDEN", message: WINDOW_CLOSED });
  }

  await database.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(matches)
      .where(eq(matches.id, match.id))
      .for("update");
    const windowState =
      locked?.status === MatchStatusEnum.COMPLETED
        ? marksWindow(locked.completedAt, now)
        : null;
    if (!locked || windowState?.state !== "open") {
      throw new TRPCError({ code: "FORBIDDEN", message: WINDOW_CLOSED });
    }
    const removed = await tx
      .delete(marks)
      .where(
        and(
          eq(marks.matchId, locked.id),
          eq(marks.giverUserId, args.userId),
          eq(marks.receiverUserId, args.receiverUserId),
        ),
      )
      .returning({ id: marks.id });
    if (removed.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).marks.errors.markNotFound,
      });
    }
    await withdrawUnseenMarkReceived(tx, {
      matchId: locked.id,
      giverUserId: args.userId,
      receiverUserId: args.receiverUserId,
    });
  });

  return { ok: true };
}

export const retractProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      receiverUserId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return retract(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      receiverUserId: input.receiverUserId,
      locale: ctx.locale,
    });
  });
