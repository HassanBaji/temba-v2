import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { games, groupSeasons, matches } from "@repo/db";

import {
  seasonContainsDay,
  seasonOutsideDayMessage,
  seasonsOpenForDay,
} from "@repo/domain/game-season-link";
import { groupSeasonStatus } from "@repo/domain/group-season";
import { MATCH_STATUS } from "@repo/domain/match-status";
import { productDayKey } from "@repo/domain/product-timezone";
import { type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type SeasonRow = typeof groupSeasons.$inferSelect;

export async function groupSeasonRows(database: DbClient, groupId: string) {
  return database.query.groupSeasons.findMany({
    where: eq(groupSeasons.groupId, groupId),
  });
}

/** The open Season of the Group whose window holds the Game's day, if any. */
export async function seasonCoveringGameDay(
  database: DbClient,
  args: { groupId: string; windowStart: Date; now: Date },
): Promise<SeasonRow | null> {
  const seasons = await groupSeasonRows(database, args.groupId);
  return (
    seasonsOpenForDay(seasons, productDayKey(args.windowStart), args.now)[0] ??
    null
  );
}

/** A new Group Game starts in the Season that holds its day. */
export async function linkNewGameToSeason(
  database: DbClient,
  game: { id: string; groupId: string | null; windowStart: Date | null },
  now: Date = new Date(),
) {
  if (!game.groupId || !game.windowStart) {
    return null;
  }
  const season = await seasonCoveringGameDay(database, {
    groupId: game.groupId,
    windowStart: game.windowStart,
    now,
  });
  if (!season) {
    return null;
  }
  await database
    .update(games)
    .set({ seasonId: season.id })
    .where(eq(games.id, game.id));
  return season;
}

/**
 * A Season opened over days that already hold Games takes the ones not
 * linked elsewhere, so a Standing created after the fact still counts them.
 */
export async function linkUnlinkedGamesToSeason(
  database: DbClient,
  season: Pick<SeasonRow, "id" | "groupId" | "startsOn" | "endsOn">,
) {
  const rows = await database.query.games.findMany({
    where: and(eq(games.groupId, season.groupId), isNull(games.seasonId)),
    columns: { id: true, windowStart: true },
  });
  const ids = rows
    .filter(
      (row) =>
        row.windowStart != null &&
        seasonContainsDay(season, productDayKey(row.windowStart)),
    )
    .map((row) => row.id);
  if (ids.length === 0) {
    return 0;
  }
  await database
    .update(games)
    .set({ seasonId: season.id })
    .where(inArray(games.id, ids));
  return ids.length;
}

/**
 * Closing a Season early leaves its later Games without a window: each moves
 * to the Season that now holds its day, or becomes a friendly.
 */
export async function relinkGamesAfterSeasonClose(
  database: DbClient,
  season: Pick<SeasonRow, "id" | "groupId" | "endsOn">,
  now: Date,
) {
  const rows = await database.query.games.findMany({
    where: eq(games.seasonId, season.id),
    columns: { id: true, windowStart: true },
  });
  const later = rows.filter(
    (row) =>
      row.windowStart != null && productDayKey(row.windowStart) > season.endsOn,
  );
  if (later.length === 0) {
    return;
  }
  const seasons = await groupSeasonRows(database, season.groupId);
  for (const row of later) {
    const next =
      seasonsOpenForDay(
        seasons.filter((candidate) => candidate.id !== season.id),
        productDayKey(row.windowStart!),
        now,
      )[0] ?? null;
    await database
      .update(games)
      .set({ seasonId: next?.id ?? null })
      .where(eq(games.id, row.id));
  }
}

export async function gameScoreConfirmed(database: DbClient, gameId: string) {
  const completed = await database.query.matches.findFirst({
    where: and(
      eq(matches.gameId, gameId),
      eq(matches.status, MATCH_STATUS.COMPLETED),
    ),
    columns: { id: true },
  });
  return completed != null;
}

/**
 * The Season a Game may link to on `windowStart`: one of its Group's, not
 * closed, with the day inside its window. `null` unlinks. Refused once a
 * score is confirmed, because the result already counts somewhere.
 */
export async function resolveGameSeasonLink(
  database: DbClient,
  args: {
    game: { id: string; groupId: string | null; seasonId: string | null };
    seasonId: string | null;
    windowStart: Date;
    now: Date;
    locale: Locale;
  },
): Promise<SeasonRow | null> {
  const m = messagesFor(args.locale).createGame.season;
  if (!args.game.groupId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.noGroup,
    });
  }
  if (
    args.seasonId !== args.game.seasonId &&
    (await gameScoreConfirmed(database, args.game.id))
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.scoreConfirmed,
    });
  }
  if (args.seasonId === null) {
    return null;
  }
  const season = await database.query.groupSeasons.findFirst({
    where: and(
      eq(groupSeasons.id, args.seasonId),
      eq(groupSeasons.groupId, args.game.groupId),
    ),
  });
  if (!season) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.notInGroup,
    });
  }
  const dayKey = productDayKey(args.windowStart);
  if (!seasonContainsDay(season, dayKey)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: seasonOutsideDayMessage(season, dayKey, args.locale),
    });
  }
  if (
    args.seasonId !== args.game.seasonId &&
    groupSeasonStatus(season, args.now) === "closed"
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.closed,
    });
  }
  return season;
}
