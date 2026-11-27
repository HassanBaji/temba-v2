import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { groupSeries } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertMayCreateGameOnGroup } from "#src/games/access";
import { groupIsVerified } from "#src/groups/group-is-verified";
import { requireGroup } from "#src/groups/helpers/require-group";
import { seriesEditionAt } from "#src/series/series-link";

type DbClient = typeof db;

export const attachOptionsInput = z.object({
  groupId: z.string().uuid(),
  windowStart: z.coerce.date(),
  /** The Game being edited, left out of the count. */
  gameId: z.string().uuid().optional(),
});

/**
 * The Series picker of Create and Edit game (design 2a): the Group's running
 * Series by name, each with the Edition a Game on `windowStart` would be.
 * A Group that is not Verified runs no Series, so it is offered none.
 */
export async function seriesAttachOptions(
  database: DbClient,
  args: z.infer<typeof attachOptionsInput> & {
    userId: string;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const group = await requireGroup(database, args.groupId, locale);
  await assertMayCreateGameOnGroup(database, group, args.userId, locale);
  if (!groupIsVerified(group)) {
    return { options: [] };
  }
  const running = await database.query.groupSeries.findMany({
    where: and(eq(groupSeries.groupId, group.id), isNull(groupSeries.endedAt)),
    columns: { id: true, name: true, emblem: true, colour: true },
    orderBy: [asc(groupSeries.name), asc(groupSeries.id)],
  });
  const options = await Promise.all(
    running.map(async (series) => ({
      ...series,
      edition: await seriesEditionAt(database, {
        seriesId: series.id,
        windowStart: args.windowStart,
        excludeGameId: args.gameId,
      }),
    })),
  );
  return { options };
}

export const attachOptionsProcedure = protectedProcedure
  .input(attachOptionsInput)
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return seriesAttachOptions(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
