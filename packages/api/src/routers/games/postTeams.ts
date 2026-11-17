import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  matches,
} from "@repo/db";
import {
  type AlonePair,
  type AloneTeamsProblem,
  aloneTeamsProblem,
  ALONE_TEAMS_MIN_PAIRS,
} from "@repo/domain/alone-teams";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  lockGameForAdmit,
  requireGame,
} from "#src/games/access";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function problemMessage(
  problem: AloneTeamsProblem,
  teamsAllowed: number | null,
  locale: Locale,
) {
  const m = messagesFor(locale).aloneTeams.errors;
  switch (problem) {
    case "too_few_pairs":
      return m.tooFewPairs(ALONE_TEAMS_MIN_PAIRS);
    case "too_many_pairs":
      return m.tooManyPairs(teamsAllowed ?? ALONE_TEAMS_MIN_PAIRS);
    case "player_twice":
      return m.playerTwice;
    case "not_on_game":
      return m.notOnGame;
    case "left_out":
      return m.leftOut;
  }
}

function refuse(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

/**
 * Posts the teams of an Alone-only Social: each pair becomes a Game team on
 * sides 1 to n, Left then Right, and every placed player is told who their
 * partner is. Posting again replaces the teams until the draw is posted.
 */
export async function postTeams(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    pairs: readonly AlonePair[];
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const m = messagesFor(locale).aloneTeams.errors;
  const game = await requireGame(database, args.gameId, locale);
  if (!game.organizerMakesTeams || game.format !== "friendly_tournament") {
    refuse(m.notAloneOnly);
  }
  await assertGameOrganizer(database, game, args.organizerUserId, locale);

  return database.transaction(async (tx) => {
    const locked = await lockGameForAdmit(tx, game.id, locale);
    if (locked.cancelledAt) {
      refuse(m.cancelled);
    }
    if (locked.drawPostedAt) {
      refuse(m.drawPosted);
    }
    const scheduled = await tx.query.matches.findFirst({
      where: eq(matches.gameId, game.id),
      columns: { id: true },
    });
    if (scheduled) {
      refuse(m.drawPosted);
    }

    const playerRows = await tx.query.gamePlayers.findMany({
      where: eq(gamePlayers.gameId, game.id),
      columns: { id: true, userId: true },
    });
    const gamePlayerIdByUserId = new Map(
      playerRows.flatMap((row) => (row.userId ? [[row.userId, row.id]] : [])),
    );
    const problem = aloneTeamsProblem({
      pairs: args.pairs,
      playerIds: [...gamePlayerIdByUserId.keys()],
      teamsAllowed: locked.teamsAllowed,
    });
    if (problem) {
      refuse(problemMessage(problem, locked.teamsAllowed, locale));
    }

    const firstPost = locked.teamsPostedAt == null;
    const now = new Date();
    await tx.delete(gameTeams).where(eq(gameTeams.gameId, game.id));
    for (const [index, pair] of args.pairs.entries()) {
      const [team] = await tx
        .insert(gameTeams)
        .values({ gameId: game.id, sideIndex: index + 1 })
        .returning({ id: gameTeams.id });
      if (!team) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to post the teams",
        });
      }
      await tx.insert(gameTeamPlayers).values(
        (["left", "right"] as const).map((position) => ({
          gameTeamId: team.id,
          gamePlayerId: gamePlayerIdByUserId.get(pair[position]) as string,
          position,
        })),
      );
    }
    await tx
      .update(games)
      .set({ teamsPostedAt: now, updatedAt: now })
      .where(eq(games.id, game.id));

    const placed = new Set(
      args.pairs.flatMap((pair) => [pair.left, pair.right]),
    );
    const told = [
      ...args.pairs.flatMap((pair) => [
        { userId: pair.left, partnerUserId: pair.right },
        { userId: pair.right, partnerUserId: pair.left },
      ]),
      ...[...gamePlayerIdByUserId.keys()]
        .filter((userId) => !placed.has(userId))
        .map((userId) => ({ userId, partnerUserId: undefined })),
    ];
    for (const recipient of told) {
      await notify(tx, {
        type: "game_teams_posted",
        recipients: [{ userId: recipient.userId, audience: "player" }],
        excludeUserIds: [args.organizerUserId],
        actorUserId: args.organizerUserId,
        partnerUserId: recipient.partnerUserId,
        groupId: game.groupId,
        gameId: game.id,
      });
    }

    return { ok: true as const, firstPost, teamCount: args.pairs.length };
  });
}

export const postTeamsInputSchema = z.object({
  gameId: z.string().uuid(),
  pairs: z
    .array(z.object({ left: z.string().uuid(), right: z.string().uuid() }))
    .max(64),
});

export const postTeamsProcedure = protectedProcedure
  .input(postTeamsInputSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return postTeams(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      pairs: input.pairs,
      locale: ctx.locale,
    });
  });
