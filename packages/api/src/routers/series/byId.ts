import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { sportOrDefault } from "@repo/domain/sport";
import { isAmericano } from "@repo/domain/tournament-americano";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertCanViewGroup } from "#src/groups/helpers/assert-can-view-group";
import { isGroupApprover } from "#src/groups/helpers/is-group-approver";
import {
  loadSeriesEditions,
  seriesEditionWindowEnded,
  type SeriesEdition,
} from "#src/series/load-series-editions";
import { playerWinWith } from "#src/series/player-series-wins";
import { requireSeries, seriesHasGame } from "#src/series/series-link";

type DbClient = typeof db;

export const seriesByIdInput = z.object({
  id: z.string().uuid(),
});

type MostWinsRow = {
  userId: string;
  name: string;
  image: string | null;
  wins: number;
  lastWonEdition: number;
  isViewer: boolean;
};

function editionState(
  edition: SeriesEdition,
  now: Date,
): "upcoming" | "awaiting" | "no_winner" | "won" {
  if (edition.result.state !== "upcoming") {
    return edition.result.state;
  }
  return seriesEditionWindowEnded(edition.game, now) ? "awaiting" : "upcoming";
}

function isDecided(edition: SeriesEdition) {
  return edition.result.state !== "upcoming";
}

/** The latest won Edition's winners hold the Series until another is won. */
function holdersOf(editions: readonly SeriesEdition[], viewerUserId: string) {
  const latest = [...editions]
    .reverse()
    .find((edition) => edition.result.state === "won");
  const players = (latest?.winners ?? []).flatMap((winner) =>
    winner.isGuest
      ? []
      : [
          {
            userId: winner.userId,
            name: winner.name,
            image: winner.image,
            isViewer: winner.userId === viewerUserId,
          },
        ],
  );
  return latest && players.length > 0
    ? { edition: latest.edition, players }
    : null;
}

/** The earliest Edition still to be decided, and whether its window is ahead, on, or over. */
function nextEditionOf(editions: readonly SeriesEdition[], now: Date) {
  const next = editions.find((edition) => !isDecided(edition));
  if (!next) {
    return null;
  }
  const { game } = next;
  const started =
    game.windowStart !== null && game.windowStart.getTime() <= now.getTime();
  const state: "upcoming" | "live" | "awaiting" = seriesEditionWindowEnded(
    game,
    now,
  )
    ? "awaiting"
    : started
      ? "live"
      : "upcoming";
  return {
    gameId: game.id,
    edition: next.edition,
    startsAt: game.windowStart,
    endsAt: game.windowEnd,
    state,
    venueName: game.venueName,
    taken: next.playerCount,
    capacity:
      game.playersAllowed ??
      (game.teamsAllowed === null ? null : game.teamsAllowed * 2),
  };
}

/** How big the Edition's field was: players on an Americano, teams otherwise; none on football. */
function fieldOf(edition: SeriesEdition) {
  if (edition.game.sport === "football") {
    return null;
  }
  return isAmericano(edition.game.format, edition.game.tournamentShape)
    ? { unit: "players" as const, count: edition.playerCount }
    : { unit: "teams" as const, count: edition.teamCount };
}

/** A won football Edition's score, from the winning side. */
function winnerScore(edition: SeriesEdition) {
  const [winner] = edition.winners;
  if (edition.game.sport !== "football" || !winner) {
    return null;
  }
  const score = playerWinWith(edition, winner.userId).score;
  return score ? { winner: score.mine, loser: score.theirs } : null;
}

/** Every winner with an account, by wins, then the more recent win, then name. */
function mostWins(editions: readonly SeriesEdition[], viewerUserId: string) {
  const byUser = new Map<string, MostWinsRow>();
  for (const edition of editions) {
    for (const winner of edition.winners) {
      if (winner.isGuest) {
        continue;
      }
      const row = byUser.get(winner.userId) ?? {
        userId: winner.userId,
        name: winner.name,
        image: winner.image,
        wins: 0,
        lastWonEdition: 0,
        isViewer: winner.userId === viewerUserId,
      };
      row.wins += 1;
      row.lastWonEdition = Math.max(row.lastWonEdition, edition.edition);
      byUser.set(winner.userId, row);
    }
  }
  return [...byUser.values()].sort(
    (left, right) =>
      right.wins - left.wins ||
      right.lastWonEdition - left.lastWonEdition ||
      left.name.localeCompare(right.name),
  );
}

/**
 * A Series' page (design 05): its badge and Group, who holds it, how many
 * Editions were played and by how many different winners, the next Edition,
 * the viewer's own record, who has won it most, and every Edition newest
 * first. Whoever may view the Group may read it; a Guest player is named on
 * their Edition and nowhere else.
 */
export async function seriesById(
  database: DbClient,
  args: z.infer<typeof seriesByIdInput> & {
    userId: string;
    now?: Date;
    getPublicMetadata?: () => Promise<Record<string, unknown> | undefined>;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const series = await requireSeries(database, args.id, locale);
  await assertCanViewGroup(
    database,
    series.group,
    args.userId,
    args.getPublicMetadata,
    locale,
  ).catch((error: unknown) => {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).series.errors.notFound,
      });
    }
    throw error;
  });
  const now = args.now ?? new Date();

  const [approver, editions, hasGame, viewer] = await Promise.all([
    isGroupApprover(database, series.group, args.userId),
    loadSeriesEditions(database, { seriesIds: [series.id] }),
    seriesHasGame(database, series.id),
    database.query.user.findFirst({
      where: eq(user.id, args.userId),
      columns: { name: true, image: true },
    }),
  ]);
  const winners = mostWins(editions, args.userId);
  const decided = editions.filter(isDecided);
  const viewerWins = winners.find((winner) => winner.isViewer);

  return {
    id: series.id,
    name: series.name,
    emblem: series.emblem,
    colour: series.colour,
    sport: sportOrDefault(series.group.sport),
    group: { id: series.group.id, name: series.group.name },
    endedAt: series.endedAt,
    createdAt: series.createdAt,
    canEnd: approver && series.endedAt === null,
    endRemoves: !hasGame,
    playedCount: decided.length,
    differentWinners: winners.length,
    mostWins: winners,
    holders: holdersOf(editions, args.userId),
    nextEdition: series.endedAt === null ? nextEditionOf(editions, now) : null,
    viewer: {
      name: viewer?.name ?? "",
      image: viewer?.image ?? null,
      played: decided.filter((edition) =>
        edition.playedUserIds.includes(args.userId),
      ).length,
      decided: decided.length,
      wins: viewerWins?.wins ?? 0,
      lastWonEdition: viewerWins?.lastWonEdition ?? null,
    },
    editions: [...editions]
      .sort((left, right) => right.edition - left.edition)
      .map((edition) => ({
        gameId: edition.game.id,
        edition: edition.edition,
        startsAt: edition.game.windowStart,
        state: editionState(edition, now),
        winners: edition.winners.map((winner) => ({
          userId: winner.userId,
          name: winner.name,
          image: winner.image,
          isGuest: winner.isGuest,
          isViewer: winner.userId === args.userId,
        })),
        winnerBib: edition.winnerBib,
        field: fieldOf(edition),
        points: edition.winnerPoints,
        score: winnerScore(edition),
      })),
  };
}

export const byIdProcedure = protectedProcedure
  .input(seriesByIdInput)
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return seriesById(ctx.db, {
      ...input,
      userId: appUser.id,
      getPublicMetadata: ctx.getPublicMetadata,
      locale: ctx.locale,
    });
  });
