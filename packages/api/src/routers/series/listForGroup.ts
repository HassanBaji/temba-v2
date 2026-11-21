import { eq } from "drizzle-orm";
import { z } from "zod";

import { groupSeries } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { sportOrDefault, type Sport } from "@repo/domain/sport";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { groupIsVerified } from "#src/groups/group-is-verified";
import { assertCanViewGroup } from "#src/groups/helpers/assert-can-view-group";
import { isGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireGroup } from "#src/groups/helpers/require-group";
import {
  loadSeriesEditions,
  seriesEditionWindowEnded,
  type SeriesEdition,
} from "#src/series/load-series-editions";

type DbClient = typeof db;

export const listForGroupInput = z.object({
  groupId: z.string().uuid(),
});

type SeriesRow = {
  id: string;
  name: string;
  emblem: (typeof groupSeries.$inferSelect)["emblem"];
  colour: (typeof groupSeries.$inferSelect)["colour"];
  sport: Sport;
  kind: "social" | "game" | null;
  playedCount: number;
  next: { gameId: string; edition: number; startsAt: Date | null } | null;
  endedAt: Date | null;
};

function kindOf(edition: SeriesEdition | undefined) {
  if (!edition) {
    return null;
  }
  return edition.game.format === "friendly_tournament" ? "social" : "game";
}

function nextEdition(editions: readonly SeriesEdition[], now: Date) {
  const next = editions.find(
    (edition) =>
      edition.result.state === "upcoming" &&
      !seriesEditionWindowEnded(edition.game, now),
  );
  return next
    ? {
        gameId: next.game.id,
        edition: next.edition,
        startsAt: next.game.windowStart,
      }
    : null;
}

function byNextThenName(left: SeriesRow, right: SeriesRow) {
  if (left.next && right.next) {
    const byStart =
      (left.next.startsAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
      (right.next.startsAt?.getTime() ?? Number.MAX_SAFE_INTEGER);
    if (byStart !== 0) {
      return byStart;
    }
  } else if (left.next || right.next) {
    return left.next ? -1 : 1;
  }
  return left.name.localeCompare(right.name);
}

/**
 * The Group's Series tab (design 1a): its running Series, the next Edition
 * first, then its ended ones, most recently ended first. Whoever may view the
 * Group may read it; a Group that is not Verified has no Series tab.
 */
export async function listSeriesForGroup(
  database: DbClient,
  args: z.infer<typeof listForGroupInput> & {
    userId: string;
    now?: Date;
    getPublicMetadata?: () => Promise<Record<string, unknown> | undefined>;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const group = await requireGroup(database, args.groupId, locale);
  await assertCanViewGroup(
    database,
    group,
    args.userId,
    args.getPublicMetadata,
    locale,
  );
  if (!groupIsVerified(group)) {
    return {
      enabled: false,
      canManage: false,
      running: [] as SeriesRow[],
      ended: [] as SeriesRow[],
    };
  }
  const now = args.now ?? new Date();

  const [approver, seriesRows] = await Promise.all([
    isGroupApprover(database, group, args.userId),
    database.query.groupSeries.findMany({
      where: eq(groupSeries.groupId, group.id),
      columns: {
        id: true,
        name: true,
        emblem: true,
        colour: true,
        endedAt: true,
      },
    }),
  ]);
  const editions = await loadSeriesEditions(database, {
    seriesIds: seriesRows.map((series) => series.id),
  });

  const rows = seriesRows.map((series): SeriesRow => {
    const own = editions.filter(
      (edition) => edition.game.seriesId === series.id,
    );
    return {
      ...series,
      sport: sportOrDefault(group.sport),
      kind: kindOf(own.at(-1)),
      playedCount: own.filter((edition) => edition.result.state !== "upcoming")
        .length,
      next: nextEdition(own, now),
    };
  });

  return {
    enabled: true,
    canManage: approver,
    running: rows.filter((row) => row.endedAt === null).sort(byNextThenName),
    ended: rows
      .filter((row) => row.endedAt !== null)
      .sort(
        (left, right) =>
          (right.endedAt?.getTime() ?? 0) - (left.endedAt?.getTime() ?? 0),
      ),
  };
}

export const listForGroupProcedure = protectedProcedure
  .input(listForGroupInput)
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listSeriesForGroup(ctx.db, {
      ...input,
      userId: appUser.id,
      getPublicMetadata: ctx.getPublicMetadata,
      locale: ctx.locale,
    });
  });
