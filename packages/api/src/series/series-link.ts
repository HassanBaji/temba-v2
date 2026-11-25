import { TRPCError } from "@trpc/server";
import {
  and,
  count,
  eq,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { games, groupSeries, type groups } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { carriesSeries, type SeriesCarrierGame } from "@repo/domain/series";

import { type db } from "#src/db";
import { gameScoreConfirmed } from "#src/games/season-link";
import { groupIsVerified } from "#src/groups/group-is-verified";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The Series with its Group. A deleted Group takes its Series' doors with it. */
export async function requireSeries(
  database: DbClient,
  id: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const series = await database.query.groupSeries.findFirst({
    where: eq(groupSeries.id, id),
    with: { group: true },
  });
  if (series?.group.deletedAt === null) {
    return series;
  }
  throw new TRPCError({
    code: "NOT_FOUND",
    message: messagesFor(locale).series.errors.notFound,
  });
}

/**
 * Whether any Game points at the Series, cancelled ones included. Ending a
 * Series with one keeps it; ending one with none deletes it.
 */
export async function seriesHasGame(database: DbClient, seriesId: string) {
  const [attached] = await database
    .select({ id: games.id })
    .from(games)
    .where(eq(games.seriesId, seriesId))
    .limit(1);
  return attached !== undefined;
}

/**
 * Once the score is in, a Game's Series link is locked both ways: a completed
 * Match, or a posted King of the court Final order.
 */
export async function seriesLinkLocked(
  database: DbClient,
  game: { id: string; finalOrderPostedAt: Date | null },
) {
  return (
    game.finalOrderPostedAt !== null ||
    (await gameScoreConfirmed(database, game.id))
  );
}

/** The Series a Game being created or edited may link to, or the localized refusal. */
export async function resolveGameSeriesLink(
  database: DbClient,
  args: {
    game: SeriesCarrierGame & { windowStart: Date | null };
    group: Pick<
      typeof groups.$inferSelect,
      "id" | "verifiedAt" | "venueId"
    > | null;
    seriesId: string;
    locale: Locale;
  },
) {
  const errors = messagesFor(args.locale).series.errors;
  const refuse = (message: string): never => {
    throw new TRPCError({ code: "BAD_REQUEST", message });
  };
  const group = args.group;
  if (!group) {
    return refuse(errors.notInGroup);
  }
  const series = await requireSeries(database, args.seriesId, args.locale);
  if (series.groupId !== group.id || args.game.groupId !== group.id) {
    return refuse(errors.notInGroup);
  }
  if (!groupIsVerified(group)) {
    throw new TRPCError({ code: "FORBIDDEN", message: errors.verifiedOnly });
  }
  if (!carriesSeries(args.game)) {
    return refuse(errors.cannotCarry);
  }
  if (!args.game.windowStart) {
    return refuse(errors.needsDay);
  }
  if (series.endedAt !== null) {
    return refuse(errors.ended);
  }
  return series;
}

async function seriesGamesCounted(
  database: DbClient,
  seriesId: string,
  before: SQL | undefined,
) {
  const [row] = await database
    .select({ value: count() })
    .from(games)
    .where(
      and(eq(games.seriesId, seriesId), isNull(games.cancelledAt), before),
    );
  return row?.value ?? 0;
}

/**
 * The Series of a Game with its Edition number: its place among the Series'
 * Games that are not cancelled, by window start, then creation time, then id,
 * as `seriesEditionNumbers` orders them. A cancelled Game is no Edition.
 */
export async function gameSeriesSummary(
  database: DbClient,
  game: { id: string; seriesId: string | null; cancelledAt: Date | null },
) {
  if (!game.seriesId || game.cancelledAt) {
    return null;
  }
  const series = await database.query.groupSeries.findFirst({
    where: eq(groupSeries.id, game.seriesId),
    columns: { id: true, name: true, emblem: true, colour: true },
  });
  if (!series) {
    return null;
  }
  // Compared in SQL against the Game's own row: stored times keep microseconds
  // a JavaScript Date would round away, and two Games could then tie.
  const earlier = await seriesGamesCounted(
    database,
    series.id,
    sql`(${games.windowStart}, ${games.createdAt}, ${games.id}) < (select self.window_start, self.created_at, self.id from games self where self.id = ${game.id})`,
  );
  return { ...series, edition: earlier + 1 };
}

/**
 * The Edition number a Game starting at `windowStart` would hold. A new Game
 * is created after every Game already there, so one on the same start counts
 * before it; the Game being edited (`excludeGameId`) keeps its own place.
 */
export async function seriesEditionAt(
  database: DbClient,
  args: { seriesId: string; windowStart: Date; excludeGameId?: string },
) {
  const before = args.excludeGameId
    ? and(
        ne(games.id, args.excludeGameId),
        or(
          lt(games.windowStart, args.windowStart),
          and(
            eq(games.windowStart, args.windowStart),
            sql`(${games.createdAt}, ${games.id}) < (select self.created_at, self.id from games self where self.id = ${args.excludeGameId})`,
          ),
        ),
      )
    : lte(games.windowStart, args.windowStart);
  return (await seriesGamesCounted(database, args.seriesId, before)) + 1;
}
