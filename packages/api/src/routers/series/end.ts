import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { games, groupSeries } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireSeries } from "#src/series/series-link";

type DbClient = typeof db;

export const endSeriesInput = z.object({
  id: z.string().uuid(),
});

/**
 * A Group approver ends a Series: nothing can be attached to it any more, and
 * its Editions and wins stay. A Series no Game ever pointed at, cancelled ones
 * included, has nothing to keep and is deleted instead. Ending does not ask
 * for a Verified Group.
 */
export async function endSeries(
  database: DbClient,
  args: z.infer<typeof endSeriesInput> & {
    userId: string;
    now?: Date;
    locale?: Locale;
  },
): Promise<{ ended: true } | { deleted: true }> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const series = await requireSeries(database, args.id, locale);
  await assertGroupApprover(database, series.group, args.userId, locale);
  const now = args.now ?? new Date();

  return database.transaction(async (tx) => {
    const [locked] = await tx
      .select({ endedAt: groupSeries.endedAt })
      .from(groupSeries)
      .where(eq(groupSeries.id, series.id))
      .for("update");
    if (!locked) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).series.errors.notFound,
      });
    }
    if (locked.endedAt !== null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).series.errors.alreadyEnded,
      });
    }

    const [attached] = await tx
      .select({ id: games.id })
      .from(games)
      .where(eq(games.seriesId, series.id))
      .limit(1);
    if (!attached) {
      await tx.delete(groupSeries).where(eq(groupSeries.id, series.id));
      return { deleted: true } as const;
    }

    await tx
      .update(groupSeries)
      .set({ endedAt: now, endedBy: args.userId, updatedAt: now })
      .where(eq(groupSeries.id, series.id));
    return { ended: true } as const;
  });
}

export const endProcedure = protectedProcedure
  .input(endSeriesInput)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return endSeries(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
