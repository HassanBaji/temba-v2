import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { gamePlayers, gameTeams, ratings } from "@repo/db";
import {
  ALONE_TEAMS_MIN_PLAYERS,
  awaitsOrganizerTeams,
} from "@repo/domain/alone-teams";
import { levelFromMu } from "@repo/domain/level";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * What Make teams and Share teams read on an Alone-only Social: every
 * player in sign-up order with their padel Level and the side they asked
 * for, and the teams as posted.
 */
export async function teamsSheet(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  if (!game.organizerMakesTeams) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).aloneTeams.errors.notAloneOnly,
    });
  }
  await assertGameOrganizer(database, game, args.userId, locale);

  const playerRows = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, game.id),
    with: {
      user: { columns: { id: true, name: true, image: true } },
    },
    orderBy: [asc(gamePlayers.createdAt), asc(gamePlayers.id)],
  });
  const userIds = playerRows.flatMap((row) => (row.user ? [row.user.id] : []));
  const ratingRows =
    userIds.length > 0
      ? await database.query.ratings.findMany({
          where: and(
            inArray(ratings.userId, userIds),
            eq(ratings.sport, "padel"),
          ),
          columns: { userId: true, mu: true, levelBand: true },
        })
      : [];
  const ratingByUserId = new Map(ratingRows.map((row) => [row.userId, row]));

  const teamRows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, game.id),
    with: {
      players: {
        with: { gamePlayer: { columns: { userId: true } } },
      },
    },
    orderBy: [asc(gameTeams.sideIndex), asc(gameTeams.createdAt)],
  });

  const players = playerRows.flatMap((row) => {
    if (!row.user) {
      return [];
    }
    const rating = ratingByUserId.get(row.user.id);
    return [
      {
        userId: row.user.id,
        name: row.user.name,
        image: row.user.image,
        level: rating ? levelFromMu(rating.mu) : null,
        levelBand: rating ? displayLabelFromStoredBand(rating.levelBand) : null,
        preferredSide: row.preferredSide,
      },
    ];
  });

  const userIdAt = (
    team: (typeof teamRows)[number],
    position: "left" | "right",
  ) =>
    team.players.find((link) => link.position === position)?.gamePlayer
      .userId ?? null;

  return {
    gameId: game.id,
    teamsAllowed: game.teamsAllowed,
    teamsPostedAt: game.teamsPostedAt,
    drawPosted: game.drawPostedAt != null,
    awaitsTeams: awaitsOrganizerTeams(game),
    minPlayers: ALONE_TEAMS_MIN_PLAYERS,
    canPost:
      game.cancelledAt == null &&
      game.drawPostedAt == null &&
      players.length >= ALONE_TEAMS_MIN_PLAYERS,
    players,
    teams: teamRows.map((team) => ({
      gameTeamId: team.id,
      sideIndex: team.sideIndex,
      left: userIdAt(team, "left"),
      right: userIdAt(team, "right"),
    })),
  };
}

export const teamsSheetProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return teamsSheet(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
